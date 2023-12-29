export enum EOAISingleVerbsEnum {
    "GetRecord",
    "Identify",
    "ListMetadataFormats",
}

export enum EOAIListVerbsEnum {
    "ListIdentifiers",
    "ListRecords",
    "ListSets"
}

export type TOAISingleVerbs = keyof typeof EOAISingleVerbsEnum;
export type TOAIListVerbs = keyof typeof EOAIListVerbsEnum;
