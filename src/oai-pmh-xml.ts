import * as xml2js from "xml2js";
import { z } from "zod";

import { OaiPmhError } from "./errors";

const ZOAIError = z.object({
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

const ZOAIResumptionToken = z.object({
	_: z.string().optional(),
	expirationDate: z.array(z.string().datetime()).optional(),
	completeListSize: z.array(z.number().positive()).optional(),
	cursor: z.array(z.number().nonnegative()).optional(),
});

export type TOAIResumptionToken = z.infer<typeof ZOAIResumptionToken>;

const ZOAIResponse = z.object({
	"OAI-PMH": z.object({
		responseDate: z.array(
			z.object({
				_: z.string().datetime(),
			}),
		),
		request: z.unknown(),
		error: z.array(ZOAIError).optional(),
		GetRecord: z.array(z.object({ record: z.array(z.object({})) })).optional(),
		ListMetadataFormats: z
			.array(
				z.object({
					metadataFormat: z.array(
						z.object({
							metadataPrefix: z.array(z.object({ _: z.string() })),
							schema: z.array(z.object({ _: z.string().url() })),
							metadataNamespace: z.array(z.object({ _: z.string().url() })),
						}),
					),
				}),
			)
			.optional(),
		Identify: z
			.array(
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
			)
			.optional(),
		ListSets: z
			.array(
				z.object({
					set: z.array(z.unknown()),
					resumptionToken: z.array(ZOAIResumptionToken).optional(),
				}),
			)
			.optional(),
		ListIdentifiers: z
			.array(
				z.object({
					header: z.array(z.unknown()),
					resumptionToken: z.array(ZOAIResumptionToken).optional(),
				}),
			)
			.optional(),
		ListRecords: z
			.array(
				z.object({
					record: z.array(z.unknown()).optional(),
					resumptionToken: z.array(ZOAIResumptionToken).optional(),
				}),
			)
			.optional(),
	}),
});

export type TOAIResponse = z.infer<typeof ZOAIResponse>;

/**
 * parses an XML response into JSON and checks for the availability of basic properties
 * required for a valid OAI-PMH response
 * @param xml
 * @returns {Promise<any>}
 */
export async function parseOaiPmhXml(xml: string): Promise<TOAIResponse> {
	const parser = new xml2js.Parser({
		explicitCharkey: true,
		explicitArray: true,
		trim: true,
		normalize: true,
	});
	const obj = await parser.parseStringPromise(xml);
	console.log(JSON.stringify(obj, null, 2));
	const oaiPmh = ZOAIResponse.passthrough().parse(obj);
	if (!oaiPmh) {
		throw new OaiPmhError("Returned data does not conform to OAI-PMH", "none");
	}

	const error = oaiPmh["OAI-PMH"].error;
	if (error) {
		error.forEach((e) => {
			throw new OaiPmhError(`OAI-PMH provider returned an error: ${e._}`, e.$.code);
		});
	}

	return oaiPmh;
}