#!/usr/bin/env node
import { defineCommand, runMain } from "citty";

import {
  type IOAIListIdentifiersRequestParamsInterface,
  type IOAIListRecordsRequestParamsInterface,
  type IOAIListRequestParamsInterface,
  type IOAIListMetadataFormatsRequestParamsInterface,
  OaiPmh,
} from "../src/index.js";

type RequestMethod = "GET" | "POST";

const requestMethodArg = {
  default: "GET" as const,
  description: "HTTP request method",
  options: ["GET", "POST"],
  type: "enum" as const,
};

const baseUrlArg = {
  description: "OAI-PMH endpoint base URL",
  required: true,
  type: "positional",
  valueHint: "url",
} as const;

function writeJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function writeJsonLine(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function stringArg(args: Record<string, unknown>, name: string): string {
  const value = args[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function optionalStringArg(args: Record<string, unknown>, name: string): string | undefined {
  const value = args[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function requestMethod(args: Record<string, unknown>): RequestMethod {
  return args.requestMethod === "POST" ? "POST" : "GET";
}

function createHarvester(args: Record<string, unknown>): OaiPmh {
  return new OaiPmh({
    baseUrl: stringArg(args, "baseUrl"),
    requestMethod: requestMethod(args),
  });
}

function listIdentifiersParams(
  args: Record<string, unknown>,
): IOAIListIdentifiersRequestParamsInterface {
  const params: IOAIListIdentifiersRequestParamsInterface = {};
  for (const key of ["from", "metadataPrefix", "resumptionToken", "set", "until"] as const) {
    const value = optionalStringArg(args, key);
    if (value !== undefined) params[key] = value;
  }
  return params;
}

function listRecordsParams(args: Record<string, unknown>): IOAIListRecordsRequestParamsInterface {
  const params: IOAIListRecordsRequestParamsInterface = {};
  for (const key of ["from", "metadataPrefix", "resumptionToken", "set", "until"] as const) {
    const value = optionalStringArg(args, key);
    if (value !== undefined) params[key] = value;
  }
  return params;
}

function listMetadataFormatsParams(
  args: Record<string, unknown>,
): IOAIListMetadataFormatsRequestParamsInterface {
  const identifier = optionalStringArg(args, "identifier");
  return identifier === undefined ? {} : { identifier };
}

function listRequestParams(args: Record<string, unknown>): IOAIListRequestParamsInterface {
  const resumptionToken = optionalStringArg(args, "resumptionToken");
  return resumptionToken === undefined ? {} : { resumptionToken };
}

const identify = defineCommand({
  args: {
    baseUrl: baseUrlArg,
    requestMethod: requestMethodArg,
  },
  meta: {
    description: "Retrieve repository information",
    name: "identify",
  },
  async run({ args }) {
    writeJson(await createHarvester(args as Record<string, unknown>).identify());
  },
});

const getRecord = defineCommand({
  args: {
    baseUrl: baseUrlArg,
    identifier: {
      alias: ["i"],
      description: "Record identifier",
      required: true,
      type: "string",
    },
    metadataPrefix: {
      alias: ["p"],
      description: "Metadata prefix",
      required: true,
      type: "string",
    },
    requestMethod: requestMethodArg,
  },
  meta: {
    description: "Retrieve an individual record",
    name: "get-record",
  },
  async run({ args }) {
    const parsedArgs = args as Record<string, unknown>;
    writeJson(
      await createHarvester(parsedArgs).getRecord({
        identifier: stringArg(parsedArgs, "identifier"),
        metadataPrefix: stringArg(parsedArgs, "metadataPrefix"),
      }),
    );
  },
});

const listIdentifiers = defineCommand({
  args: {
    baseUrl: baseUrlArg,
    from: {
      description: "Lower inclusive datestamp bound",
      type: "string",
      valueHint: "date",
    },
    metadataPrefix: {
      alias: ["p"],
      description: "Metadata prefix",
      type: "string",
    },
    requestMethod: requestMethodArg,
    resumptionToken: {
      description: "Exclusive OAI-PMH resumption token",
      type: "string",
    },
    set: {
      alias: ["s"],
      description: "Set specifier",
      type: "string",
    },
    until: {
      description: "Upper inclusive datestamp bound",
      type: "string",
      valueHint: "date",
    },
  },
  meta: {
    description: "List record headers",
    name: "list-identifiers",
  },
  async run({ args }) {
    const parsedArgs = args as Record<string, unknown>;
    for await (const item of createHarvester(parsedArgs).listIdentifiers(
      listIdentifiersParams(parsedArgs),
    )) {
      writeJsonLine(item);
    }
  },
});

const listMetadataFormats = defineCommand({
  args: {
    baseUrl: baseUrlArg,
    identifier: {
      alias: ["i"],
      description: "Record identifier",
      type: "string",
    },
    requestMethod: requestMethodArg,
  },
  meta: {
    description: "List supported metadata formats",
    name: "list-metadata-formats",
  },
  async run({ args }) {
    const parsedArgs = args as Record<string, unknown>;
    writeJson(
      await createHarvester(parsedArgs).listMetadataFormats(listMetadataFormatsParams(parsedArgs)),
    );
  },
});

const listRecords = defineCommand({
  args: {
    baseUrl: baseUrlArg,
    from: {
      description: "Lower inclusive datestamp bound",
      type: "string",
      valueHint: "date",
    },
    metadataPrefix: {
      alias: ["p"],
      description: "Metadata prefix",
      type: "string",
    },
    requestMethod: requestMethodArg,
    resumptionToken: {
      description: "Exclusive OAI-PMH resumption token",
      type: "string",
    },
    set: {
      alias: ["s"],
      description: "Set specifier",
      type: "string",
    },
    until: {
      description: "Upper inclusive datestamp bound",
      type: "string",
      valueHint: "date",
    },
  },
  meta: {
    description: "List full records",
    name: "list-records",
  },
  async run({ args }) {
    const parsedArgs = args as Record<string, unknown>;
    for await (const item of createHarvester(parsedArgs).listRecords(
      listRecordsParams(parsedArgs),
    )) {
      writeJsonLine(item);
    }
  },
});

const listSets = defineCommand({
  args: {
    baseUrl: baseUrlArg,
    requestMethod: requestMethodArg,
    resumptionToken: {
      description: "Exclusive OAI-PMH resumption token",
      type: "string",
    },
  },
  meta: {
    description: "List repository sets",
    name: "list-sets",
  },
  async run({ args }) {
    const parsedArgs = args as Record<string, unknown>;
    for await (const item of createHarvester(parsedArgs).listSets(listRequestParams(parsedArgs))) {
      writeJsonLine(item);
    }
  },
});

const main = defineCommand({
  meta: {
    description: "OAI-PMH 2.0 harvester",
    name: "oai-pmh",
    version: "1.0.0",
  },
  subCommands: {
    "get-record": getRecord,
    identify,
    "list-identifiers": listIdentifiers,
    "list-metadata-formats": listMetadataFormats,
    "list-records": listRecords,
    "list-sets": listSets,
  },
});

await runMain(main);
