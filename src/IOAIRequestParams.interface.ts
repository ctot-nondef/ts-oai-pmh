export interface IOAIGetRecordRequestParamsInterface {
  identifier: string;
  metadataPrefix: string;
}

export interface IOAIListRequestParamsInterface {
  resumptionToken?: string;
}

export interface IOAIListIdentifiersRequestParamsInterface {
  metadataPrefix?: string;
  from?: Date | string;
  until?: Date | string;
  set?: string;
  resumptionToken?: string;
}

export interface IOAIListMetadataFormatsRequestParamsInterface {
  identifier?: string;
}

export interface IOAIListRecordsRequestParamsInterface {
  metadataPrefix?: string;
  from?: Date | string;
  until?: Date | string;
  set?: string;
  resumptionToken?: string;
}
