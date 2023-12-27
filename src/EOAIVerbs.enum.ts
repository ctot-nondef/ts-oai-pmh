export enum EOAIVerbsEnum {
    "GetRecord",
    "Identify",
    "ListIdentifiers",
    "ListMetadataFormats",
    "ListRecords",
    "ListSets"
}

export type TOAIVerbs = keyof typeof EOAIVerbsEnum;
