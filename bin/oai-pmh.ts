#!/usr/bin/env node
import { Command } from "commander";
import { pick } from "lodash";

import { OaiPmh } from "../src";
import type { IOAIGetRecordRequestParamsInterface } from "../src/IOAIRequestParams.interface";

const program = new Command();
program.version("0.0.1");

// eslint-disable-next-line @typescript-eslint/require-await
async function wrapAsync(fun: () => Promise<void>) {
	fun().then(
		() => process.exit(0),
		(err: Error) => {
			process.stderr.write(`${err.toString()}\n`);
			process.exit(1);
		},
	);
}

function printJson(obj) {
	process.stdout.write(`${JSON.stringify(obj)}\n`);
}

async function printList(asyncGenerator) {
	for await (const item of asyncGenerator) {
		printJson(item);
	}
}

program
	.command("get-record <baseUrl>")
	.option("-i, --identifier <id>")
	.option("-p, --metadata-prefix <prefix>")
	.action((baseUrl, options: IOAIGetRecordRequestParamsInterface) =>
		wrapAsync(async () => {
			const oaiPmh = new OaiPmh(baseUrl as unknown as URL);
			const result = await oaiPmh.getRecord({ ...options });
			printJson(result);
		}),
	);

program.command("identify <baseUrl>").action((baseUrl) =>
	wrapAsync(async () => {
		const oaiPmh = new OaiPmh(baseUrl as URL);
		const result = await oaiPmh.identify();
		printJson(result);
	}),
);

program
	.command("list-identifiers <baseUrl>")
	.option("-p, --metadata-prefix <prefix>")
	.option("-f, --from <DATE>", "from date YYYY-MM-DD or ISO8601")
	.option("-u, --until <DATE>", "from date YYYY-MM-DD or ISO8601")
	.option("-s, --set <SETSPEC>", 'set specifier, e.g., "math"')
	.action((baseUrl, _options) =>
		wrapAsync(async () => {
			const options = pick(_options, "metadataPrefix", "from", "until", "set");
			const oaiPmh = new OaiPmh(baseUrl as URL);
			await printList(oaiPmh.listIdentifiers(options));
		}),
	);

program
	.command("list-metadata-formats <baseUrl>")
	.option("-i, --identifier <id>")
	.action((baseUrl, _options) =>
		wrapAsync(async () => {
			const options = pick(_options, "identifier");
			const oaiPmh = new OaiPmh(baseUrl);
			const result = await oaiPmh.listMetadataFormats(options);
			printJson(result);
		}),
	);

program
	.command("list-records <baseUrl>")
	.option("-p, --metadata-prefix <prefix>")
	.option("-f, --from <DATE>", "from date YYYY-MM-DD or ISO8601")
	.option("-u, --until <DATE>", "from date YYYY-MM-DD or ISO8601")
	.option("-s, --set <SETSPEC>", 'set specifier, e.g., "math"')
	.action((baseUrl, _options) =>
		wrapAsync(async () => {
			const options = pick(_options, "metadataPrefix", "from", "until", "set");
			const oaiPmh = new OaiPmh(baseUrl);
			await printList(oaiPmh.listRecords(options));
		}),
	);

program.command("list-sets <baseUrl>").action((baseUrl) =>
	wrapAsync(async () => {
		const oaiPmh = new OaiPmh(baseUrl as URL);
		await printList(oaiPmh.listSets());
	}),
);

program.parse(process.argv);
