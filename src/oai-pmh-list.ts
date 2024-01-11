import type { TOAIListVerbs } from "./EOAIVerbs.enum";
import type { OaiPmh } from "./index";
import { parseOaiPmhXml } from "./oai-pmh-xml";
import type {
	TOAIListIdenfifiersResponse,
	TOAIListRecordsResponse,
	TOAIListSetsResponse,
} from "./TOAIResponse.type";

function getResumptionToken(
	result: TOAIListIdenfifiersResponse | TOAIListRecordsResponse | TOAIListSetsResponse,
	listSize: number,
) {
	const token = result[0].resumptionToken;
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
	params: Record<string, string | undefined>,
	field: string,
) {
	const initialResponse = await oaiPmh.request({}, verb, { ...params });
	const initialParsedResponse = (await parseOaiPmhXml(initialResponse.data, verb)) as
		| TOAIListIdenfifiersResponse
		| TOAIListRecordsResponse
		| TOAIListSetsResponse;
	for (const item of initialParsedResponse[0][field]) {
		yield item;
	}
	let result = initialParsedResponse;
	let resumptionToken: string | undefined;
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	while ((resumptionToken = getResumptionToken(result, result[0][field].length as number))) {
		const response = await oaiPmh.request({}, verb, { resumptionToken });
		result = (await parseOaiPmhXml(response.data, verb)) as
			| TOAIListIdenfifiersResponse
			| TOAIListRecordsResponse
			| TOAIListSetsResponse;
		for (const item of result[field]) {
			yield item;
		}
	}
}
