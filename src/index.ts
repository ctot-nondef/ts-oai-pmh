import axios, { type AxiosError, type AxiosRequestConfig, type AxiosResponse } from "axios";

import type { TOAIListVerbs, TOAISingleVerbs } from "./EOAIVerbs.enum";
import { OaiPmhError } from "./errors";
import type { IOAIHarvesterInterface } from "./IOAIHarvester.interface";
import type { IOAIHarvesterOptionsInterface } from "./IOAIHarvesterOptions.interface";
import type * as RequestParamInterfaces from "./IOAIRequestParams.interface";
import type { IOAIListRecordsRequestParamsInterface } from "./IOAIRequestParams.interface";
import { getOaiListItems } from "./oai-pmh-list";
import { parseOaiPmhXml } from "./oai-pmh-xml";
import { sleep } from "./utils";

/**
 * @implements IOAIHarvesterInterface
 */
export class OaiPmh implements IOAIHarvesterInterface {
	public baseUrl: URL;
	public options: IOAIHarvesterOptionsInterface;

	constructor(baseUrl: URL, _options = {}) {
		this.baseUrl = baseUrl;
		this.options = {
			userAgent: `oai-pmh/0.0.1 (https://github.com/ctot-nondef/oai-pmh)`,
			retry: true, // automatically retry in case of status code 503
			retryMin: 5, // wait at least 5 seconds
			retryMax: 600, // wait at maximum 600 seconds
		};
		Object.assign(this.options, _options);
	}

	/**
	 * sets the baseUrl of the OAI-PMH Endpoint to be used
	 * @param url
	 */
	public setBaseUrl = (url: URL): void => {
		this.baseUrl = url;
	};

	/**
	 * creates an HTTP request to the OAI-PMH endpoint
	 * @param requestConfig
	 * @param verb
	 * @param params
	 */
	public request = async (
		requestConfig: AxiosRequestConfig,
		verb: TOAIListVerbs | TOAISingleVerbs,
		params: Record<string, any>,
	) => {
		let res: AxiosResponse;
		//TODO this should be formatted dynamically according to granularity annuncenced
		//TODO during identify action
		if (params.from) params.from = params.from.toISOString().split("T")[0];
		if (params.until) params.until = params.until.toISOString().split("T")[0];

		do {
			res = await axios
				.get(this.baseUrl as unknown as string, {
					params: {
						verb,
						...params,
					},
					headers: {
						...(requestConfig.headers || {}),
						"User-Agent": this.options.userAgent,
					},
				})
				.catch(async (err: AxiosError) => {
					if (err.response.status === 503 && this.options.retry) {
						res = err.response;
						const retryAfter = res.headers["retry-after"];

						if (!retryAfter) {
							throw new OaiPmhError("Status code 503 without Retry-After header.", "none");
						}

						let retrySeconds: number;
						if (/^\s*\d+\s*$/.test(retryAfter)) {
							retrySeconds = parseInt(retryAfter, 10);
						} else {
							const retryDate = new Date(retryAfter);
							if (!retryDate) {
								throw new OaiPmhError("Status code 503 with invalid Retry-After header.", "none");
							}
							retrySeconds = Math.floor(
								((retryDate as unknown as number) - (new Date() as unknown as number)) / 1000,
							);
						}

						if (retrySeconds < this.options.retryMin) {
							retrySeconds = this.options.retryMin;
						} else if (retrySeconds > this.options.retryMax) {
							retrySeconds = this.options.retryMax;
						}

						// wait
						await sleep(retrySeconds);
						return res;
					}
				});
		} while (res.status === 503 && this.options.retry);
		return res;
	};

	/**
	 * retrieve information about a repository
	 * https://www.openarchives.org/OAI/openarchivesprotocol.html#Identify
	 */
	public identify = async () => {
		const res = await this.request({}, "Identify", {});
		const obj = await parseOaiPmhXml(res.data);
		return obj["OAI-PMH"].Identify;
	};

	/**
	 * retrieve an individual metadata record from a repository
	 * https://www.openarchives.org/OAI/openarchivesprotocol.html#GetRecord
	 * @param params
	 */
	public getRecord = async (params: RequestParamInterfaces.IOAIGetRecordRequestParamsInterface) => {
		const res = await this.request({}, "GetRecord", {
			...params,
		});

		const obj = await parseOaiPmhXml(res.data);
		return obj["OAI-PMH"].GetRecord[0].record;
	};

	/**
	 * an abbreviated form of ListRecords, retrieving only headers rather than records
	 * https://www.openarchives.org/OAI/openarchivesprotocol.html#ListIdentifiers
	 * @param params
	 */
	public listIdentifiers = (
		params: RequestParamInterfaces.IOAIListIdentifiersRequestParamsInterface,
	) => {
		return getOaiListItems(this, "ListIdentifiers", { ...params }, "header");
	};

	/**
	 * retrieve the metadata formats available from a repository for a specific record
	 * @param params
	 */
	async listMetadataFormats(
		params: RequestParamInterfaces.IOAIListMetadataFormatsRequestParamsInterface,
	) {
		const res = await this.request({}, "ListMetadataFormats", {
			identifier: params.identifier,
		});
		const obj = await parseOaiPmhXml(res.data);
		return obj["OAI-PMH"].ListMetadataFormats[0].metadataFormat;
	}

	/**
	 * harvest records from a repository
	 * https://www.openarchives.org/OAI/openarchivesprotocol.html#ListRecords
	 * @param params
	 */
	listRecords(params: IOAIListRecordsRequestParamsInterface) {
		return getOaiListItems(this, "ListRecords", { ...params }, "record");
	}

	/**
	 * retrieve the set structure of a repository
	 * https://www.openarchives.org/OAI/openarchivesprotocol.html#ListSets
	 */
	listSets() {
		return getOaiListItems(this, "ListSets", {}, "set");
	}
}
