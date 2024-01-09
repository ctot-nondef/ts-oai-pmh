import type { AxiosResponse } from "axios";

import type { TOAIListVerbs } from "./EOAIVerbs.enum";
import type { OaiPmh } from "./index";
import { parseOaiPmhXml, type TOAIResumptionToken } from "./oai-pmh-xml";

function getResumptionToken(
	result: { resumptionToken?: Array<TOAIResumptionToken> },
	listSize: number,
) {
	const token = result.resumptionToken;
	if (!token) return undefined;

	if (typeof token === "string") return token;

	const cursor = token[0].cursor;
	const completeListSize = token[0].completeListSize;
	if (cursor && completeListSize && cursor[0] + listSize >= completeListSize[0]) return undefined;

	return token[0]._;
}

/**
 * generic request function generator
 * @param oaiPmh
 * @param verb
 * @param params
 * @param field
 */
export async function* getOaiListItems(
	oaiPmh: OaiPmh,
	verb: TOAIListVerbs,
	params: Record<string, any>,
	field: string,
) {
	const initialResponse = await oaiPmh.request({}, verb, { ...params });
	const initialParsedResponse = await parseOaiPmhXml(initialResponse.data);
	const initialResult = initialParsedResponse["OAI-PMH"][verb];
	for (const item of initialResult[0][field]) {
		yield item;
	}
	let result = initialResult[0];
	let resumptionToken: string;
	while ((resumptionToken = getResumptionToken(result, result[field].length))) {
		const response: AxiosResponse = await oaiPmh.request({}, verb, { resumptionToken });
		const parsedResponse = await parseOaiPmhXml(response.data);
		result = parsedResponse["OAI-PMH"][verb][0];
		for (const item of result[field]) {
			yield item;
		}
	}
}