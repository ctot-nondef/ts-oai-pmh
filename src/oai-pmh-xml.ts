import * as xml2js from "xml2js";

import type { TOAIListVerbs, TOAIVerb } from "./EOAIVerbs.enum.js";
import { OaiPmhError, type TOAIProtocolErrorCode } from "./errors.js";
import {
  type TOAIGetRecordsResponse,
  type TOAIHeader,
  type TOAIIdentifyResponse,
  type TOAIIdentifyResponseData,
  type TOAIListIdenfifiersResponse,
  type TOAIListMetadataFormatsResponse,
  type TOAIListRecordsResponse,
  type TOAIListResponseData,
  type TOAIListSetsResponse,
  type TOAIMetadataFormat,
  type TOAIRecord,
  type TOAIRequest,
  type TOAIResumptionToken,
  type TOAIResponse,
  type TOAISet,
  type TOAIXmlElement,
  ZOAIEnvelope,
} from "./TOAIResponse.type.js";

const parser = new xml2js.Parser({
  attrkey: "$",
  charkey: "_",
  explicitArray: true,
  explicitCharkey: true,
  normalize: true,
  trim: true,
});

const RESPONSE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asElement(value: unknown): TOAIXmlElement {
  return typeof value === "object" && value !== null ? (value as TOAIXmlElement) : {};
}

function firstElement(value: unknown): TOAIXmlElement {
  return asElement(asArray(value)[0]);
}

function getField(element: TOAIXmlElement, field: string): unknown {
  return element[field];
}

function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return text(value[0]);
  const element = asElement(value);
  if (typeof element._ === "string") return element._;
  return "";
}

function requiredText(element: TOAIXmlElement, field: string): string {
  const value = text(getField(element, field));
  if (value.length === 0) {
    throw new OaiPmhError(
      `OAI-PMH response is missing required field "${field}".`,
      "invalidResponse",
    );
  }
  return value;
}

function optionalTextArray(element: TOAIXmlElement, field: string): string[] {
  return asArray(getField(element, field))
    .map((item) => text(item))
    .filter((item) => item.length > 0);
}

function parseRequest(request: TOAIXmlElement): TOAIRequest {
  const attributes = request.$ ?? {};
  const verb = attributes.verb as TOAIVerb | undefined;
  return {
    attributes,
    baseUrl: text(request),
    ...(verb ? { verb } : {}),
  };
}

function parseEnvelope<TData>(obj: unknown, verb: TOAIVerb, data: TData): TOAIResponse<TData> {
  const envelope = ZOAIEnvelope.parse(obj)["OAI-PMH"];
  const responseDate = text(envelope.responseDate);
  if (!RESPONSE_DATE_PATTERN.test(responseDate) || Number.isNaN(Date.parse(responseDate))) {
    throw new OaiPmhError(
      "OAI-PMH responseDate must be a UTC datetime with seconds granularity.",
      "invalidResponse",
    );
  }

  return {
    data,
    request: parseRequest(firstElement(envelope.request)),
    responseDate,
  };
}

function throwProtocolError(obj: unknown): void {
  const parsed = ZOAIEnvelope.parse(obj)["OAI-PMH"];
  if (!parsed.error) return;

  const first = parsed.error[0];
  if (!first) return;

  throw new OaiPmhError(
    `OAI-PMH provider returned an error: ${first._ ?? first.$.code}`,
    first.$.code as TOAIProtocolErrorCode,
  );
}

function parseHeader(value: unknown): TOAIHeader {
  const element = asElement(value);
  const identifier = requiredText(element, "identifier");
  const datestamp = requiredText(element, "datestamp");
  const rawStatus = element.$?.status;
  if (rawStatus !== undefined && rawStatus !== "deleted") {
    throw new OaiPmhError(`Unsupported OAI-PMH header status "${rawStatus}".`, "invalidResponse");
  }
  return {
    datestamp,
    identifier,
    raw: value,
    setSpecs: optionalTextArray(element, "setSpec"),
    ...(rawStatus === "deleted" ? { status: "deleted" as const } : {}),
  };
}

function parseRecord(value: unknown): TOAIRecord {
  const element = asElement(value);
  const header = parseHeader(firstElement(getField(element, "header")));
  const metadata = asArray(getField(element, "metadata"))[0];
  return {
    about: asArray(getField(element, "about")),
    header,
    raw: value,
    ...(metadata === undefined ? {} : { metadata }),
  };
}

function parseMetadataFormat(value: unknown): TOAIMetadataFormat {
  const element = asElement(value);
  return {
    metadataNamespace: requiredText(element, "metadataNamespace"),
    metadataPrefix: requiredText(element, "metadataPrefix"),
    raw: value,
    schema: requiredText(element, "schema"),
  };
}

function parseSet(value: unknown): TOAISet {
  const element = asElement(value);
  return {
    raw: value,
    setDescription: asArray(getField(element, "setDescription")),
    setName: requiredText(element, "setName"),
    setSpec: requiredText(element, "setSpec"),
  };
}

function numberAttribute(value: string | undefined): number | undefined {
  if (value === undefined || value.length === 0) return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function parseResumptionToken(value: unknown): TOAIResumptionToken | undefined {
  const token = firstElement(value);
  const tokenValue = text(token);
  if (tokenValue.length === 0 && !token.$) return undefined;
  const completeListSize = numberAttribute(token.$?.completeListSize);
  const cursor = numberAttribute(token.$?.cursor);

  return {
    value: tokenValue,
    ...(token.$?.expirationDate ? { expirationDate: token.$.expirationDate } : {}),
    ...(completeListSize !== undefined ? { completeListSize } : {}),
    ...(cursor !== undefined ? { cursor } : {}),
  };
}

function parseListData<TItem>(
  container: TOAIXmlElement,
  itemField: string,
  parseItem: (value: unknown) => TItem,
): TOAIListResponseData<TItem> {
  const token = parseResumptionToken(getField(container, "resumptionToken"));
  return {
    items: asArray(getField(container, itemField)).map(parseItem),
    ...(token ? { resumptionToken: token } : {}),
  };
}

function requireVerbContainer(obj: unknown, verb: TOAIVerb): TOAIXmlElement {
  const envelope = ZOAIEnvelope.parse(obj)["OAI-PMH"];
  const container = firstElement(envelope[verb]);
  if (Object.keys(container).length === 0) {
    throw new OaiPmhError(`OAI-PMH response is missing ${verb}.`, "invalidResponse");
  }
  return container;
}

export async function parseOaiPmhXml(xml: string, verb: "Identify"): Promise<TOAIIdentifyResponse>;
export async function parseOaiPmhXml(
  xml: string,
  verb: "GetRecord",
): Promise<TOAIGetRecordsResponse>;
export async function parseOaiPmhXml(
  xml: string,
  verb: "ListMetadataFormats",
): Promise<TOAIListMetadataFormatsResponse>;
export async function parseOaiPmhXml(
  xml: string,
  verb: "ListIdentifiers",
): Promise<TOAIListIdenfifiersResponse>;
export async function parseOaiPmhXml(
  xml: string,
  verb: "ListRecords",
): Promise<TOAIListRecordsResponse>;
export async function parseOaiPmhXml(xml: string, verb: "ListSets"): Promise<TOAIListSetsResponse>;
export async function parseOaiPmhXml(
  xml: string,
  verb: TOAIVerb,
): Promise<
  | TOAIGetRecordsResponse
  | TOAIIdentifyResponse
  | TOAIListIdenfifiersResponse
  | TOAIListMetadataFormatsResponse
  | TOAIListRecordsResponse
  | TOAIListSetsResponse
> {
  let obj: unknown;
  try {
    obj = await parser.parseStringPromise(xml);
  } catch (cause) {
    throw new OaiPmhError("Returned data is not parseable XML.", "invalidResponse", { cause });
  }

  try {
    throwProtocolError(obj);
    switch (verb) {
      case "Identify": {
        const container = requireVerbContainer(obj, verb);
        const data: TOAIIdentifyResponseData = {
          adminEmails: optionalTextArray(container, "adminEmail"),
          baseURL: requiredText(container, "baseURL"),
          compressions: optionalTextArray(container, "compression"),
          deletedRecord: requiredText(
            container,
            "deletedRecord",
          ) as TOAIIdentifyResponseData["deletedRecord"],
          descriptions: asArray(getField(container, "description")),
          earliestDatestamp: requiredText(container, "earliestDatestamp"),
          granularity: requiredText(
            container,
            "granularity",
          ) as TOAIIdentifyResponseData["granularity"],
          protocolVersion: requiredText(container, "protocolVersion"),
          repositoryName: requiredText(container, "repositoryName"),
        };
        return parseEnvelope(obj, verb, data);
      }
      case "GetRecord": {
        const container = requireVerbContainer(obj, verb);
        return parseEnvelope(obj, verb, parseRecord(firstElement(getField(container, "record"))));
      }
      case "ListMetadataFormats": {
        const container = requireVerbContainer(obj, verb);
        return parseEnvelope(
          obj,
          verb,
          asArray(getField(container, "metadataFormat")).map(parseMetadataFormat),
        );
      }
      case "ListIdentifiers": {
        const container = requireVerbContainer(obj, verb);
        return parseEnvelope(obj, verb, parseListData(container, "header", parseHeader));
      }
      case "ListRecords": {
        const container = requireVerbContainer(obj, verb);
        return parseEnvelope(obj, verb, parseListData(container, "record", parseRecord));
      }
      case "ListSets": {
        const container = requireVerbContainer(obj, verb);
        return parseEnvelope(obj, verb, parseListData(container, "set", parseSet));
      }
    }
  } catch (error) {
    if (error instanceof OaiPmhError) throw error;
    throw new OaiPmhError("Returned data does not conform to OAI-PMH.", "invalidResponse", {
      cause: error,
    });
  }
}

export function hasMoreResumptionToken(
  response: TOAIListIdenfifiersResponse | TOAIListRecordsResponse | TOAIListSetsResponse,
): boolean {
  return (response.data.resumptionToken?.value ?? "").length > 0;
}

export function getResumptionToken(
  response: TOAIListIdenfifiersResponse | TOAIListRecordsResponse | TOAIListSetsResponse,
): string | undefined {
  const value = response.data.resumptionToken?.value;
  return value && value.length > 0 ? value : undefined;
}

export type TOAIListParserResponse =
  | TOAIListIdenfifiersResponse
  | TOAIListRecordsResponse
  | TOAIListSetsResponse;

export type TOAIListItem<TVerb extends TOAIListVerbs> = TVerb extends "ListIdentifiers"
  ? TOAIHeader
  : TVerb extends "ListRecords"
    ? TOAIRecord
    : TOAISet;
