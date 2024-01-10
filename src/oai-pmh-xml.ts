import * as xml2js from "xml2js";

import { OaiPmhError } from "./errors";
import * as OAIResponseTypes from "./TOAIResponse.type"

/**
 * parses an XML response into JSON and checks for the availability of basic properties
 * required for a valid OAI-PMH response
 * @param xml
 * @returns {Promise<any>}
 */
export async function parseOaiPmhXml(xml: string): Promise<OAIResponseTypes.TOAIResponse> {
	const parser = new xml2js.Parser({
		explicitCharkey: true,
		explicitArray: true,
		trim: true,
		normalize: true,
	});
	const obj = (await parser.parseStringPromise(xml)) as Record<string, string>;
	const oaiPmh = OAIResponseTypes.ZOAIResponse.passthrough().parse(obj);
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

	return oaiPmh;
}
