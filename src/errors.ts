export type TOAIProtocolErrorCode =
  | "badArgument"
  | "badResumptionToken"
  | "badVerb"
  | "cannotDisseminateFormat"
  | "idDoesNotExist"
  | "noMetadataFormats"
  | "noRecordsMatch"
  | "noSetHierarchy";

export type TOAIClientErrorCode =
  | TOAIProtocolErrorCode
  | "badClientArgument"
  | "invalidResponse"
  | "transportError";

export class OaiPmhError extends Error {
  public readonly code: TOAIClientErrorCode;
  public readonly status?: number;

  constructor(
    message: string,
    code: TOAIClientErrorCode,
    options: { status?: number; cause?: unknown } = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    if (options.status !== undefined) {
      this.status = options.status;
    }
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
    Error.captureStackTrace?.(this, this.constructor);
  }
}
