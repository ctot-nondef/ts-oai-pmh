import { z } from "zod";

export const ZOAIError = z.object({
	$: z.object({
		code: z.enum([
			"cannotDisseminateFormat",
			"idDoesNotExist",
			"badArgument",
			"badVerb",
			"noMetadataFormats",
			"noRecordsMatch",
			"badResumptionToken",
			"noSetHierarchy",
		]),
	}),
	_: z.string(),
});

export const ZOAIResumptionToken = z.object({
	_: z.string().optional(),
	expirationDate: z.array(z.string().datetime()).optional(),
	completeListSize: z.array(z.number().positive()).optional(),
	cursor: z.array(z.number().nonnegative()).optional(),
});
export type TOAIResumptionToken = z.infer<typeof ZOAIResumptionToken>;

export const ZOAIGetRecordsResponse = z.array(z.object({ record: z.array(z.object({})) }));
export type TOAIGetRecordsResponse = z.infer<typeof ZOAIGetRecordsResponse>;

export const ZOAIListMetadataFormatsResponse = z.array(
	z.object({
		metadataFormat: z.array(
			z.object({
				metadataPrefix: z.array(z.object({ _: z.string() })),
				schema: z.array(z.object({ _: z.string().url() })),
				metadataNamespace: z.array(z.object({ _: z.string().url() })),
			}),
		),
	}),
);
export type TOAIListMetadataFormatsResponse = z.infer<typeof ZOAIListMetadataFormatsResponse>;

export const ZOAIIdentifyResponse = z.array(
	z.object({
		repositoryName: z.array(z.object({ _: z.string() })),
		baseURL: z.array(z.object({ _: z.string().url() })),
		protocolVersion: z.array(z.object({ _: z.string() })),
		adminEmail: z.array(z.object({ _: z.string().email() })),
		earliestDatestamp: z.array(z.object({ _: z.string() })),
		deletedRecord: z.array(z.object({ _: z.enum(["no", "persistent", "transient"]) })),
		granularity: z.array(z.object({ _: z.enum(["YYYY-MM-DD", "YYYY-MM-DDThh:mm:ssZ"]) })),
		compression: z.array(z.object({ _: z.string() })).optional(),
		description: z.array(z.any()),
	}),
);
export type TOAIIdentifyResponse = z.infer<typeof ZOAIIdentifyResponse>;

export const ZOAIListSetsResponse = z.array(
	z.object({
		set: z.array(z.unknown()),
		resumptionToken: z.array(ZOAIResumptionToken).optional(),
	}),
);
export type TOAIListSetsResponse = z.infer<typeof ZOAIListSetsResponse>;

export const ZOAIListIdenfifiersResponse = z.array(
	z.object({
		header: z.array(z.unknown()),
		resumptionToken: z.array(ZOAIResumptionToken).optional(),
	}),
);
export type TOAIListIdenfifiersResponse = z.infer<typeof ZOAIListIdenfifiersResponse>;

export const ZOAIListRecordsResponse = z.array(
	z.object({
		record: z.array(z.unknown()).optional(),
		resumptionToken: z.array(ZOAIResumptionToken).optional(),
	}),
);
export type TOAIListRecordsResponse = z.infer<typeof ZOAIListRecordsResponse>;

export const ZOAIResponse = z.object({
	"OAI-PMH": z.object({
		responseDate: z.array(
			z.object({
				_: z.string().datetime(),
			}),
		),
		request: z.unknown(),
		error: z.array(ZOAIError).optional(),
		GetRecord: ZOAIGetRecordsResponse.optional(),
		ListMetadataFormats: ZOAIListMetadataFormatsResponse.optional(),
		Identify: ZOAIIdentifyResponse.optional(),
		ListSets: ZOAIListSetsResponse.optional(),
		ListIdentifiers: ZOAIListIdenfifiersResponse.optional(),
		ListRecords: ZOAIListRecordsResponse.optional(),
	}),
});
export type TOAIResponse = z.infer<typeof ZOAIResponse>;
