import type { TOAIListVerbs, TOAIVerb } from "./EOAIVerbs.enum.js";
import { OaiPmhError } from "./errors.js";
import type {
  IOAIHarvesterConstructorOptionsInterface,
  IOAIHarvesterInterface,
  IOAIHarvesterOptionsInterface,
  IOAIRetryOptionsInterface,
} from "./IOAIHarvester.interface.js";
import type {
  IOAIGetRecordRequestParamsInterface,
  IOAIListIdentifiersRequestParamsInterface,
  IOAIListMetadataFormatsRequestParamsInterface,
  IOAIListRecordsRequestParamsInterface,
  IOAIListRequestParamsInterface,
} from "./IOAIRequestParams.interface.js";
import { iterateOaiList } from "./oai-pmh-list.js";
import { parseOaiPmhXml } from "./oai-pmh-xml.js";
import type {
  TOAIGetRecordsResponse,
  TOAIHeader,
  TOAIIdentifyResponse,
  TOAIListIdenfifiersResponse,
  TOAIListMetadataFormatsResponse,
  TOAIListRecordsResponse,
  TOAIListSetsResponse,
  TOAIRecord,
  TOAISet,
} from "./TOAIResponse.type.js";
import { sleep } from "./utils.js";

export type TOAIRequestParams = Record<string, string | undefined>;
type QueryParams = TOAIRequestParams;

const DEFAULT_RETRY_OPTIONS: IOAIRetryOptionsInterface = {
  enabled: true,
  maxDelaySeconds: 600,
  maxRetries: 5,
  minDelaySeconds: 5,
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

function normalizeRetryOptions(
  retry: IOAIHarvesterConstructorOptionsInterface["retry"],
): IOAIRetryOptionsInterface {
  if (retry === false) {
    return { ...DEFAULT_RETRY_OPTIONS, enabled: false };
  }
  if (retry === true || retry === undefined) {
    return { ...DEFAULT_RETRY_OPTIONS };
  }
  return { ...DEFAULT_RETRY_OPTIONS, ...retry, enabled: retry.enabled ?? true };
}

function normalizeUrl(baseUrl: string | URL): URL {
  try {
    return new URL(baseUrl.toString());
  } catch (cause) {
    throw new OaiPmhError("baseUrl must be an absolute URL.", "badClientArgument", { cause });
  }
}

function assertKnownKeys(
  params: Record<string, unknown>,
  allowedKeys: string[],
  context: string,
): void {
  const unknownKeys = Object.keys(params).filter((key) => !allowedKeys.includes(key));
  if (unknownKeys.length > 0) {
    throw new OaiPmhError(
      `${context} does not accept argument(s): ${unknownKeys.join(", ")}.`,
      "badClientArgument",
    );
  }
}

function assertRequiredString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new OaiPmhError(`${name} is required.`, "badClientArgument");
  }
  return value;
}

function getGranularity(value: string): "date" | "dateTime" {
  if (DATE_ONLY_PATTERN.test(value) && isValidDateOnly(value)) return "date";
  if (DATE_TIME_PATTERN.test(value) && !Number.isNaN(Date.parse(value))) return "dateTime";
  throw new OaiPmhError(
    'OAI-PMH dates must be "YYYY-MM-DD" or "YYYY-MM-DDThh:mm:ssZ".',
    "badClientArgument",
  );
}

function isValidDateOnly(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function serializeDate(value: Date | string | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new OaiPmhError("Date arguments must be valid dates.", "badClientArgument");
    }
    return value.toISOString().slice(0, 10);
  }
  getGranularity(value);
  return value;
}

function compareOaiDates(left: string, right: string): number {
  const leftTime = DATE_ONLY_PATTERN.test(left)
    ? Date.parse(`${left}T00:00:00Z`)
    : Date.parse(left);
  const rightTime = DATE_ONLY_PATTERN.test(right)
    ? Date.parse(`${right}T00:00:00Z`)
    : Date.parse(right);
  return leftTime - rightTime;
}

function validateDateRange(params: {
  from?: Date | string;
  until?: Date | string;
}): Pick<QueryParams, "from" | "until"> {
  const from = serializeDate(params.from);
  const until = serializeDate(params.until);

  if (from && until) {
    if (getGranularity(from) !== getGranularity(until)) {
      throw new OaiPmhError(
        "from and until must use the same OAI-PMH granularity.",
        "badClientArgument",
      );
    }
    if (compareOaiDates(from, until) > 0) {
      throw new OaiPmhError("from must be earlier than or equal to until.", "badClientArgument");
    }
  }

  return { from, until };
}

function assertExclusiveResumptionToken(
  params: Record<string, unknown>,
  context: string,
): string | undefined {
  if (params.resumptionToken === undefined) return undefined;
  const token = assertRequiredString(params.resumptionToken, "resumptionToken");
  const otherKeys = Object.keys(params).filter(
    (key) => key !== "resumptionToken" && params[key] !== undefined,
  );
  if (otherKeys.length > 0) {
    throw new OaiPmhError(
      `${context} accepts resumptionToken only as an exclusive argument.`,
      "badClientArgument",
    );
  }
  return token;
}

function normalizeListParams(
  params: IOAIListIdentifiersRequestParamsInterface | IOAIListRecordsRequestParamsInterface,
  context: "ListIdentifiers" | "ListRecords",
): QueryParams {
  assertKnownKeys(
    params as Record<string, unknown>,
    ["metadataPrefix", "from", "until", "set", "resumptionToken"],
    context,
  );
  const resumptionToken = assertExclusiveResumptionToken(
    params as Record<string, unknown>,
    context,
  );
  if (resumptionToken) return { resumptionToken };

  const metadataPrefix = assertRequiredString(params.metadataPrefix, "metadataPrefix");
  return {
    metadataPrefix,
    set: params.set,
    ...validateDateRange(params),
  };
}

function normalizeListSetsParams(params: IOAIListRequestParamsInterface = {}): QueryParams {
  assertKnownKeys(params as Record<string, unknown>, ["resumptionToken"], "ListSets");
  const resumptionToken = assertExclusiveResumptionToken(
    params as Record<string, unknown>,
    "ListSets",
  );
  return resumptionToken ? { resumptionToken } : {};
}

function parseRetryAfter(value: string | null): number {
  if (!value) {
    throw new OaiPmhError("Status code 503 without Retry-After header.", "transportError", {
      status: 503,
    });
  }

  if (/^\s*\d+\s*$/.test(value)) {
    return Number.parseInt(value, 10);
  }

  const retryDate = Date.parse(value);
  if (Number.isNaN(retryDate)) {
    throw new OaiPmhError("Status code 503 with invalid Retry-After header.", "transportError", {
      status: 503,
    });
  }
  return Math.max(0, Math.ceil((retryDate - Date.now()) / 1000));
}

function clampDelay(seconds: number, retry: IOAIRetryOptionsInterface): number {
  return Math.max(retry.minDelaySeconds, Math.min(seconds, retry.maxDelaySeconds));
}

export class OaiPmh implements IOAIHarvesterInterface {
  public baseUrl: URL;
  public options: IOAIHarvesterOptionsInterface;

  constructor(options: IOAIHarvesterConstructorOptionsInterface) {
    this.baseUrl = normalizeUrl(options.baseUrl);
    this.options = {
      baseUrl: this.baseUrl,
      fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
      requestMethod: options.requestMethod ?? "GET",
      retry: normalizeRetryOptions(options.retry),
      userAgent: options.userAgent ?? "@nondef/ts-oai-pmh/1.0.0",
      ...(options.signal ? { signal: options.signal } : {}),
    };

    if (typeof this.options.fetch !== "function") {
      throw new OaiPmhError("A fetch implementation is required.", "badClientArgument");
    }
  }

  public setBaseUrl(url: string | URL): void {
    this.baseUrl = normalizeUrl(url);
    this.options.baseUrl = this.baseUrl;
  }

  public async request(verb: TOAIVerb, params: TOAIRequestParams = {}): Promise<string> {
    let retries = 0;

    for (;;) {
      const response = await this.fetchOnce(verb, params);
      if (response.status !== 503 || !this.options.retry.enabled) {
        if (!response.ok) {
          throw new OaiPmhError(
            `HTTP request failed with status ${response.status}.`,
            "transportError",
            {
              status: response.status,
            },
          );
        }
        return response.text();
      }

      if (retries >= this.options.retry.maxRetries) {
        throw new OaiPmhError("Retry limit reached for HTTP 503 response.", "transportError", {
          status: 503,
        });
      }

      const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
      await sleep(clampDelay(retryAfter, this.options.retry));
      retries += 1;
    }
  }

  public async identify(params: Record<string, never> = {}): Promise<TOAIIdentifyResponse> {
    assertKnownKeys(params, [], "Identify");
    const xml = await this.request("Identify", {});
    return parseOaiPmhXml(xml, "Identify");
  }

  public async getRecord(
    params: IOAIGetRecordRequestParamsInterface,
  ): Promise<TOAIGetRecordsResponse> {
    assertKnownKeys(
      params as unknown as Record<string, unknown>,
      ["identifier", "metadataPrefix"],
      "GetRecord",
    );
    const xml = await this.request("GetRecord", {
      identifier: assertRequiredString(params.identifier, "identifier"),
      metadataPrefix: assertRequiredString(params.metadataPrefix, "metadataPrefix"),
    });
    return parseOaiPmhXml(xml, "GetRecord");
  }

  public async listMetadataFormats(
    params: IOAIListMetadataFormatsRequestParamsInterface = {},
  ): Promise<TOAIListMetadataFormatsResponse> {
    assertKnownKeys(params as Record<string, unknown>, ["identifier"], "ListMetadataFormats");
    const xml = await this.request("ListMetadataFormats", {
      identifier: params.identifier,
    });
    return parseOaiPmhXml(xml, "ListMetadataFormats");
  }

  public listIdentifiers(
    params: IOAIListIdentifiersRequestParamsInterface,
  ): AsyncGenerator<TOAIHeader> {
    return iterateOaiList(normalizeListParams(params, "ListIdentifiers"), async (pageParams) => {
      const response = await this.listIdentifiersPage(pageParams);
      return response.data;
    });
  }

  public listRecords(params: IOAIListRecordsRequestParamsInterface): AsyncGenerator<TOAIRecord> {
    return iterateOaiList(normalizeListParams(params, "ListRecords"), async (pageParams) => {
      const response = await this.listRecordsPage(pageParams);
      return response.data;
    });
  }

  public listSets(params: IOAIListRequestParamsInterface = {}): AsyncGenerator<TOAISet> {
    return iterateOaiList(normalizeListSetsParams(params), async (pageParams) => {
      const response = await this.listSetsPage(pageParams);
      return response.data;
    });
  }

  private async listIdentifiersPage(params: QueryParams): Promise<TOAIListIdenfifiersResponse> {
    return this.listPage("ListIdentifiers", params);
  }

  private async listRecordsPage(params: QueryParams): Promise<TOAIListRecordsResponse> {
    return this.listPage("ListRecords", params);
  }

  private async listSetsPage(params: QueryParams): Promise<TOAIListSetsResponse> {
    return this.listPage("ListSets", params);
  }

  private async listPage(
    verb: "ListIdentifiers",
    params: QueryParams,
  ): Promise<TOAIListIdenfifiersResponse>;
  private async listPage(
    verb: "ListRecords",
    params: QueryParams,
  ): Promise<TOAIListRecordsResponse>;
  private async listPage(verb: "ListSets", params: QueryParams): Promise<TOAIListSetsResponse>;
  private async listPage(verb: TOAIListVerbs, params: QueryParams) {
    const xml = await this.request(verb, params);
    switch (verb) {
      case "ListIdentifiers":
        return parseOaiPmhXml(xml, "ListIdentifiers");
      case "ListRecords":
        return parseOaiPmhXml(xml, "ListRecords");
      case "ListSets":
        return parseOaiPmhXml(xml, "ListSets");
    }
  }

  private async fetchOnce(verb: TOAIVerb, params: QueryParams): Promise<Response> {
    const body = new URLSearchParams();
    body.set("verb", verb);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) body.set(key, value);
    }

    const headers = new Headers({
      "User-Agent": this.options.userAgent,
    });

    if (this.options.requestMethod === "POST") {
      headers.set("Content-Type", "application/x-www-form-urlencoded");
      const init: RequestInit = {
        body,
        headers,
        method: "POST",
      };
      if (this.options.signal) init.signal = this.options.signal;
      return this.options.fetch(this.baseUrl, init);
    }

    const url = new URL(this.baseUrl);
    url.search = body.toString();
    const init: RequestInit = {
      headers,
      method: "GET",
    };
    if (this.options.signal) init.signal = this.options.signal;
    return this.options.fetch(url, init);
  }
}
