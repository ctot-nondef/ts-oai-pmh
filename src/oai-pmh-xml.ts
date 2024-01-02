import * as xml2js from 'xml2js';
import { z } from "zod";
import { OaiPmhError } from './errors'

const ZOAIError = z.object({
  "$": z.object({
    code: z.enum(["cannotDisseminateFormat", "idDoesNotExist", "badArgument", "badVerb", "noMetadataFormats", "noRecordsMatch", "badResumptionToken", "noSetHierarchy"]),
  }),
  _: z.string()
})

const ZOAIResumptionToken = z.object({
  _: z.string().optional(),
  expirationDate: z.string().datetime().optional(),
  completeListSize: z.number().positive().optional(),
  cursor: z.number().nonnegative().optional()
})

export type TOAIResumptionToken = z.infer<typeof ZOAIResumptionToken>

const ZOAIResponse = z.object({
  "OAI-PMH": z.object({
    responseDate: z.object({
      _: z.string().datetime(),
    }),
    request: z.unknown(),
    error: ZOAIError.optional(),
    GetRecord: z.object({ record: z.object({}) }).optional(),
    ListMetadataFormats: z.object({
      metadataFormat: z.array(z.object({
        metadataPrefix: z.object( { _:z.string()}),
        schema: z.object( { _:z.string().url()}),
        metadataNamespace: z.object( { _:z.string().url()})
      }))
    }).optional(),
    Identify: z.object({
        repositoryName: z.object( { _: z.string()}),
        baseURL: z.object( { _: z.string().url()}),
        protocolVersion: z.object( { _: z.string()}),
        adminEmail: z.object( { _: z.string().email()}),
        earliestDatestamp: z.object( { _: z.string()}),
        deletedRecord: z.object( { _: z.enum(["no", "persistent", "transient"])}),
        granularity: z.object( { _: z.enum(["YYYY-MM-DD", "YYYY-MM-DDThh:mm:ssZ"])}),
        compression: z.object( { _: z.string()}).optional(),
        description: z.any(),
    }).optional(),
    ListSets: z.object({
      set: z.array(z.unknown()),
      resumptionToken: ZOAIResumptionToken.optional(),
    }).optional(),
    ListIdentifiers: z.object({
      header: z.array(z.unknown()),
      resumptionToken: ZOAIResumptionToken.optional(),
    }).optional(),
    ListRecords: z.object({
      record: z.array(z.unknown()).optional(),
      resumptionToken: ZOAIResumptionToken.optional(),
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
    explicitCharkey: true,
    explicitArray: false,
    trim: true,
    normalize: true
  });
  const obj = await parser.parseStringPromise(xml)
  const oaiPmh = ZOAIResponse.passthrough().parse(obj);
  if (!oaiPmh) {
    throw new OaiPmhError('Returned data does not conform to OAI-PMH' , "none");
  }

  const error = oaiPmh["OAI-PMH"].error as z.infer<typeof ZOAIError>
  if (error) {
    throw new OaiPmhError(
      `OAI-PMH provider returned an error: ${error._}`,
      error.$.code
    )
  }

  return oaiPmh
}
