export const OAI_SINGLE_VERBS = ["GetRecord", "Identify", "ListMetadataFormats"] as const;
export const OAI_LIST_VERBS = ["ListIdentifiers", "ListRecords", "ListSets"] as const;
export const OAI_VERBS = [...OAI_SINGLE_VERBS, ...OAI_LIST_VERBS] as const;

export type TOAISingleVerbs = (typeof OAI_SINGLE_VERBS)[number];
export type TOAIListVerbs = (typeof OAI_LIST_VERBS)[number];
export type TOAIVerb = (typeof OAI_VERBS)[number];
