import { expect } from "chai";

import { OaiPmh } from "../src";

const arxivBaseUrl: string = "http://export.arxiv.org/oai2";
const exlibrisBaseUrl =
	"http://bibsys-network.alma.exlibrisgroup.com/view/oai/47BIBSYS_NETWORK/request";
const gulbenkianBaseUrl = "http://arca.igc.gulbenkian.pt/oaiextended/request";

describe("OaiPmh", () => {
	describe("setBaseUrl()", () => {
		it("should set the instances baseUrl", async () => {
			const oaiPmh = new OaiPmh(arxivBaseUrl as unknown as URL);
			oaiPmh.setBaseUrl(exlibrisBaseUrl as unknown as URL);
			expect(oaiPmh.baseUrl.toString()).to.equal(exlibrisBaseUrl);
		});
	});

	describe("getRecord()", () => {
		it("should get a record", async () => {
			const oaiPmh = new OaiPmh(arxivBaseUrl as unknown as URL);
			await oaiPmh.getRecord({ identifier: "oai:arXiv.org:1412.8544", metadataPrefix: "arXiv" });
			// since we're automagically validating the response with zod anyway,
			// there's no need for further test conditions
		}).timeout(30000);
	});

	describe("identify()", () => {
		it("should identify arxiv", async () => {
			const oaiPmh = new OaiPmh(arxivBaseUrl as unknown as URL);
			await oaiPmh.identify();
		}).timeout(30000);
	});

	describe("listIdentifiers()", function () {
		// the first request to arxiv always fails with 503 and a
		// "retry after 20 seconds" message (which is OAI-PMH-compliant)
		this.timeout(90000);

		it("should list identifiers from arxiv", async () => {
			const oaiPmh = new OaiPmh(arxivBaseUrl as unknown as URL, {
				retry: true,
			});
			const options = {
				metadataPrefix: "arXiv",
				from: new Date("2009-01-01"),
				until: new Date("2009-01-02"),
			};
			const res = [];
			for await (const identifier of oaiPmh.listIdentifiers(options)) {
				res.push(identifier);
			}
			expect(res.length).to.equal(83);
		});

		it("should list identifiers with resumption token from exlibris", async () => {
			const oaiPmh = new OaiPmh(exlibrisBaseUrl as unknown as URL);
			const options = {
				metadataPrefix: "marc21",
				set: "oai_komplett",
				from: new Date("2020-01-01"),
				until: new Date("2020-01-03"),
			};
			const res = [];
			for await (const identifier of oaiPmh.listIdentifiers(options)) {
				res.push(identifier);
			}
			expect(res.length).to.equal(106);
		});

		it("should list identifiers with resumption token from gulbenkian", async () => {
			const oaiPmh = new OaiPmh(gulbenkianBaseUrl as unknown as URL);
			const options = {
				metadataPrefix: "oai_dc",
				from: new Date("2016-01-01"),
				until: new Date("2017-01-01"),
			};
			const res = [];
			for await (const identifier of oaiPmh.listIdentifiers(options)) {
				res.push(identifier);
			}
			expect(res.length).to.equal(151);
		});
	});

	describe("listMetadataFormats()", function () {
		this.timeout(30000);
		it("should list metadata formats for arxiv", async () => {
			const oaiPmh = new OaiPmh(arxivBaseUrl as unknown as URL);
			const res = await oaiPmh.listMetadataFormats({});
			expect(res.length).to.equal(4);
		});
		it("should list metadata formats for arxiv id 1208.0264", async () => {
			const oaiPmh = new OaiPmh(arxivBaseUrl as unknown as URL);
			const res = await oaiPmh.listMetadataFormats({
				identifier: "oai:arXiv.org:1208.0264",
			});
			expect(res.length).to.equal(4);
		});

		it("should fail for non-existent arxiv id lolcat", async () => {
			const oaiPmh = new OaiPmh(arxivBaseUrl as unknown as URL);
			await oaiPmh
				.listMetadataFormats({
					identifier: "oai:arXiv.org:lolcat",
				})
				.catch((err) => {
					expect(err.name).to.equal("OaiPmhError");
				});
		});
	});

	describe("listRecords()", function () {
		// the first request to arxiv always fails with 503 and a
		// "retry after 20 seconds" message (which is OAI-PMH-compliant)
		this.timeout(30000);

		it("should list identifiers from arxiv", async () => {
			const oaiPmh = new OaiPmh(arxivBaseUrl as unknown as URL);
			const options = {
				metadataPrefix: "arXiv",
				from: new Date("2015-01-01"),
				until: new Date("2015-01-03"),
			};
			const res = [];
			for await (const record of oaiPmh.listRecords(options)) {
				res.push(record);
			}
			expect(res.length).to.equal(2);
		});
	});

	describe("listSets()", () => {
		it("should list arxiv sets", async () => {
			const oaiPmh = new OaiPmh(arxivBaseUrl as unknown as URL);
			const res = [];
			for await (const set of oaiPmh.listSets()) {
				res.push(set);
			}
			expect(res.length).to.equal(21);
		});
	});
});
