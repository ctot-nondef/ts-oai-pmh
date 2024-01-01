import * as xml2js from 'xml2js';;
import { z } from "zod";
import { OaiPmhError } from './errors'

const ZOAIError = z.array(z.object({
  "$": z.object({
    code: z.enum(["cannotDisseminateFormat", "idDoesNotExist", "badArgument", "badVerb", "noMetadataFormats", "noRecordsMatch", "badResumptionToken", "noSetHierarchy"]),
  }),
  _: z.string()
}))

const ZOAIResumptionToken = z.object({
  _: z.string(),
  expirationDate: z.string().datetime(),
  completeListSize: z.number().positive(),
  cursor: z.number().nonnegative()
})

export type TOAIResumptionToken = z.infer<typeof ZOAIResumptionToken>

const ZOAIResponse = z.object({
  "OAI-PMH": z.object({
    responseDate: z.string().datetime(),
    request: z.unknown(),
    error: ZOAIError.optional(),
    GetRecord: z.object({ record: z.object({}) }).optional(),
    ListMetadataFormats: z.object({
      metadataFormat: z.object({
        metadataPrefix: z.string(),
        schema: z.string().url(),
        metadataNamespace: z.string().url()
      })
    }).optional(),
    Identify: z.object({
        repositoryName: z.string(),
        baseURL: z.string().url(),
        protocolVersion: z.string(),
        adminEmail: z.string().email(),
        earliestDatestamp: z.string(),
        deletedRecord: z.enum(["no", "persistent", "transient"]),
        granularity: z.enum(["YYYY-MM-DD", "YYYY-MM-DDThh:mm:ssZ"]),
        compression: z.string().optional(),
        description: z.any(),
    }).optional(),
    ListSets: z.object({
      resumptionToken: ZOAIResumptionToken,
    }).optional(),
    ListIdentifiers: z.object({
      resumptionToken: ZOAIResumptionToken,
    }).optional(),
    ListRecords: z.object({
      resumptionToken: ZOAIResumptionToken,
    }).optional()
  }),
})

export type TOAIResponse = z.infer<typeof ZOAIResponse>

/**
 * parses an XML response into JSON and checks for the availability of basic properties
 * required for a valid OAI-PMH response
 * @param xml
 * @returns {Promise<any>}
 */
export async function parseOaiPmhXml (xml: string): Promise<TOAIResponse> {
  const parser = new xml2js.Parser({
    explicitArray: false,
    trim: true,
    normalize: true
  });
  const obj = await parser.parseStringPromise(xml)
  const oaiPmh = ZOAIResponse.passthrough().parse(obj);
  if (!oaiPmh) {
    throw new OaiPmhError('Returned data does not conform to OAI-PMH' , "none");
  }

  const error = oaiPmh["OAI-PMH"].error
  if (error) {
    throw new OaiPmhError(
      `OAI-PMH provider returned an error: ${error._}`,
      error.code
    )
  }

  return oaiPmh
}
