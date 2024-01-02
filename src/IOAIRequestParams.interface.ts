export interface IOAIGetRecordRequestParamsInterface {
    identifier: string;
    metadataPrefix: string;
}

export interface IOAIListIdentifiersRequestParamsInterface {
    metadataPrefix: string;
    from: Date;
    until: Date;
    set?: string;
}

export interface IOAIListMetadataFormatsRequestParamsInterface {
    identifier?: string;
}

export interface IOAIListRecordsRequestParamsInterface {
    metadataPrefix: string;
    from: Date;
    until: Date;
    set?: string;
}
