import { OaiPmh } from "./index";
import { parseOaiPmhXml } from './oai-pmh-xml'

import {TOAIListVerbs} from "./EOAIVerbs.enum";
import {TOAIResumptionToken} from "./oai-pmh-xml";
import {AxiosResponse} from "axios";
function getResumptionToken (result: { resumptionToken?: TOAIResumptionToken }, listSize: number) {
  const token = result.resumptionToken
  if (!token) return undefined

  if (typeof token === 'string') return token

  const cursor = token.cursor;
  const completeListSize = token.completeListSize;
  if (
    cursor &&
    completeListSize &&
    cursor + listSize >= completeListSize
  ) return undefined

  return token._
}

/**
 * generic request function generator
 * @param oaiPmh
 * @param verb
 * @param params
 * @param field
 */
export async function* getOaiListItems (oaiPmh: OaiPmh, verb: TOAIListVerbs, params: Record<string, any>, field: string) {
  const initialResponse = await oaiPmh.request({}, verb, {...params});
  const initialParsedResponse = await parseOaiPmhXml(initialResponse.data)
  const initialResult = initialParsedResponse["OAI-PMH"][verb]
  for (const item of initialResult[field]) {
    yield item
  }
  let result = initialResult
  let resumptionToken: string;
  while ((resumptionToken = getResumptionToken(result, result[field].length))) {
    const response: AxiosResponse = await oaiPmh.request({}, verb, { resumptionToken });
    const parsedResponse = await parseOaiPmhXml(response.data)
    result = parsedResponse[verb]
    for (const item of result[field]) {
      yield item
    }
  }
}
