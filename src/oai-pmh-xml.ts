/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as xml2js from "xml2js";

import type { TOAIListVerbs, TOAISingleVerbs } from "./EOAIVerbs.enum";
import { OaiPmhError } from "./errors";
import {
	type TOAIGetRecordsResponse,
	type TOAIIdentifyResponse,
	type TOAIListIdenfifiersResponse,
	type TOAIListMetadataFormatsResponse,
	type TOAIListRecordsResponse,
	type TOAIListSetsResponse,
	ZOAIResponse,
} from "./TOAIResponse.type";

/**
 * parses an XML response into JSON and checks for the availability of basic properties
 * required for a valid OAI-PMH response
 * @param xml
 * @param verb
 * @returns {Promise<any>}
 */
export async function parseOaiPmhXml(
	xml: string,
	verb: TOAIListVerbs | TOAISingleVerbs,
): Promise<
	| TOAIGetRecordsResponse
	| TOAIIdentifyResponse
	| TOAIListIdenfifiersResponse
	| TOAIListMetadataFormatsResponse
	| TOAIListRecordsResponse
	| TOAIListSetsResponse
> {
	const parser = new xml2js.Parser({
		explicitCharkey: true,
		explicitArray: true,
		trim: true,
		normalize: true,
	});
	const obj = (await parser.parseStringPromise(xml)) as Record<string, string>;
	const oaiPmh = ZOAIResponse.passthrough().parse(obj);
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (!oaiPmh) {
		throw new OaiPmhError("Returned data does not conform to OAI-PMH", "none");
	}

	const error = oaiPmh["OAI-PMH"].error;
	if (error) {
		error.forEach((e) => {
			throw new OaiPmhError(`OAI-PMH provider returned an error: ${e._}`, e.$.code);
		});
	}

	switch (verb) {
		case "GetRecord":
			return oaiPmh["OAI-PMH"].GetRecord!;
		case "Identify":
			return oaiPmh["OAI-PMH"].Identify!;
		case "ListIdentifiers":
			return oaiPmh["OAI-PMH"].ListIdentifiers!;
		case "ListMetadataFormats":
			return oaiPmh["OAI-PMH"].ListMetadataFormats!;
		case "ListRecords":
			return oaiPmh["OAI-PMH"].ListRecords!;
		case "ListSets":
			return oaiPmh["OAI-PMH"].ListSets!;
	}
}
