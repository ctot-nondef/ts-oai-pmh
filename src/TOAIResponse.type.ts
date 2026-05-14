import { z } from "zod";

import type { TOAIVerb } from "./EOAIVerbs.enum.js";
import type { TOAIProtocolErrorCode } from "./errors.js";

export const ZOAIProtocolErrorCode = z.enum([
  "badArgument",
  "badResumptionToken",
  "badVerb",
  "cannotDisseminateFormat",
  "idDoesNotExist",
  "noMetadataFormats",
  "noRecordsMatch",
  "noSetHierarchy",
]);

export const ZOAIEnvelope = z
  .object({
    "OAI-PMH": z
      .object({
        responseDate: z.array(z.unknown()).min(1),
        request: z.array(z.unknown()).min(1),
        error: z
          .array(
            z.object({
              $: z.object({
                code: ZOAIProtocolErrorCode,
              }),
              _: z.string().optional(),
            }),
          )
          .optional(),
      })
      .passthrough(),
  })
  .passthrough();

export type TOAIXmlElement = {
  _?: string;
  $?: Record<string, string>;
  [key: string]: unknown;
};

export interface TOAIRequest {
  baseUrl: string;
  attributes: Record<string, string>;
  verb?: TOAIVerb;
}

export interface TOAIResponse<TData> {
  responseDate: string;
  request: TOAIRequest;
  data: TData;
}

export interface TOAIProtocolError {
  code: TOAIProtocolErrorCode;
  message: string;
}

export interface TOAIResumptionToken {
  value: string;
  expirationDate?: string;
  completeListSize?: number;
  cursor?: number;
}

export interface TOAIIdentifyResponseData {
  repositoryName: string;
  baseURL: string;
  protocolVersion: string;
  adminEmails: string[];
  earliestDatestamp: string;
  deletedRecord: "no" | "persistent" | "transient";
  granularity: "YYYY-MM-DD" | "YYYY-MM-DDThh:mm:ssZ";
  compressions: string[];
  descriptions: unknown[];
}

export interface TOAIHeader {
  identifier: string;
  datestamp: string;
  setSpecs: string[];
  status?: "deleted";
  raw: unknown;
}

export interface TOAIRecord {
  header: TOAIHeader;
  metadata?: unknown;
  about: unknown[];
  raw: unknown;
}

export interface TOAIMetadataFormat {
  metadataPrefix: string;
  schema: string;
  metadataNamespace: string;
  raw: unknown;
}

export interface TOAISet {
  setSpec: string;
  setName: string;
  setDescription: unknown[];
  raw: unknown;
}

export interface TOAIListResponseData<TItem> {
  items: TItem[];
  resumptionToken?: TOAIResumptionToken;
}

export type TOAIIdentifyResponse = TOAIResponse<TOAIIdentifyResponseData>;
export type TOAIGetRecordsResponse = TOAIResponse<TOAIRecord>;
export type TOAIListMetadataFormatsResponse = TOAIResponse<TOAIMetadataFormat[]>;
export type TOAIListIdenfifiersResponse = TOAIResponse<TOAIListResponseData<TOAIHeader>>;
export type TOAIListIdentifiersResponse = TOAIListIdenfifiersResponse;
export type TOAIListRecordsResponse = TOAIResponse<TOAIListResponseData<TOAIRecord>>;
export type TOAIListSetsResponse = TOAIResponse<TOAIListResponseData<TOAISet>>;
