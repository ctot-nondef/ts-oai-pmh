import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { test } from "node:test";

import { OaiPmh, OaiPmhError } from "../src/index.js";

const identifyXml = `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/">
  <responseDate>2026-05-14T10:00:00Z</responseDate>
  <request verb="Identify">https://example.org/oai</request>
  <Identify>
    <repositoryName>Example Repository</repositoryName>
    <baseURL>https://example.org/oai</baseURL>
    <protocolVersion>2.0</protocolVersion>
    <adminEmail>admin@example.org</adminEmail>
    <earliestDatestamp>2000-01-01</earliestDatestamp>
    <deletedRecord>transient</deletedRecord>
    <granularity>YYYY-MM-DD</granularity>
  </Identify>
</OAI-PMH>`;

const errorXml = `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/">
  <responseDate>2026-05-14T10:00:00Z</responseDate>
  <request verb="ListMetadataFormats" identifier="missing">https://example.org/oai</request>
  <error code="idDoesNotExist">The identifier is unknown.</error>
</OAI-PMH>`;

const deletedRecordXml = `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/">
  <responseDate>2026-05-14T10:00:00Z</responseDate>
  <request verb="GetRecord" identifier="oai:example.org:1" metadataPrefix="oai_dc">https://example.org/oai</request>
  <GetRecord>
    <record>
      <header status="deleted">
        <identifier>oai:example.org:1</identifier>
        <datestamp>2026-05-14</datestamp>
      </header>
    </record>
  </GetRecord>
</OAI-PMH>`;

const firstIdentifierPageXml = `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/">
  <responseDate>2026-05-14T10:00:00Z</responseDate>
  <request verb="ListIdentifiers" metadataPrefix="oai_dc">https://example.org/oai</request>
  <ListIdentifiers>
    <header>
      <identifier>oai:example.org:1</identifier>
      <datestamp>2026-05-14</datestamp>
      <setSpec>demo</setSpec>
    </header>
    <resumptionToken cursor="0" completeListSize="1">opaque-token</resumptionToken>
  </ListIdentifiers>
</OAI-PMH>`;

const finalIdentifierPageXml = `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/">
  <responseDate>2026-05-14T10:00:01Z</responseDate>
  <request verb="ListIdentifiers" resumptionToken="opaque-token">https://example.org/oai</request>
  <ListIdentifiers>
    <header>
      <identifier>oai:example.org:2</identifier>
      <datestamp>2026-05-15</datestamp>
    </header>
    <resumptionToken cursor="1" completeListSize="2"></resumptionToken>
  </ListIdentifiers>
</OAI-PMH>`;

interface FetchCall {
  input: string;
  init?: RequestInit;
}

function createMockFetch(responses: Response[]): { calls: FetchCall[]; fetch: typeof fetch } {
  const calls: FetchCall[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push(
      init === undefined ? { input: input.toString() } : { input: input.toString(), init },
    );
    const response = responses.shift();
    if (!response) {
      throw new Error("Unexpected fetch call.");
    }
    return response;
  };
  return { calls, fetch: fetchImpl };
}

test("identify() sends a spec-compliant GET request and parses the response", async () => {
  const { calls, fetch } = createMockFetch([new Response(identifyXml)]);
  const oaiPmh = new OaiPmh({ baseUrl: "https://example.org/oai", fetch });

  const response = await oaiPmh.identify();

  assert.equal(response.data.repositoryName, "Example Repository");
  assert.equal(response.data.protocolVersion, "2.0");
  assert.equal(response.data.granularity, "YYYY-MM-DD");
  assert.equal(calls[0]?.input, "https://example.org/oai?verb=Identify");
  assert.equal(calls[0]?.init?.method, "GET");
});

test("POST requests use application/x-www-form-urlencoded bodies", async () => {
  const { calls, fetch } = createMockFetch([new Response(identifyXml)]);
  const oaiPmh = new OaiPmh({
    baseUrl: "https://example.org/oai",
    fetch,
    requestMethod: "POST",
  });

  await oaiPmh.identify();

  assert.equal(calls[0]?.input, "https://example.org/oai");
  assert.equal(calls[0]?.init?.method, "POST");
  const headers = calls[0]?.init?.headers;
  assert.equal(headers instanceof Headers, true);
  assert.equal((headers as Headers).get("content-type"), "application/x-www-form-urlencoded");
  assert.equal(calls[0]?.init?.body?.toString(), "verb=Identify");
});

test("list requests require metadataPrefix unless resumptionToken is exclusive", () => {
  const oaiPmh = new OaiPmh({
    baseUrl: "https://example.org/oai",
    fetch: createMockFetch([]).fetch,
  });

  assert.throws(() => oaiPmh.listIdentifiers({}), /metadataPrefix is required/);
  assert.throws(
    () => oaiPmh.listIdentifiers({ metadataPrefix: "oai_dc", resumptionToken: "token" }),
    /resumptionToken only as an exclusive argument/,
  );
});

test("date bounds must use valid matching OAI-PMH granularity", () => {
  const oaiPmh = new OaiPmh({
    baseUrl: "https://example.org/oai",
    fetch: createMockFetch([]).fetch,
  });

  assert.throws(
    () =>
      oaiPmh.listRecords({
        from: "2026-99-14",
        metadataPrefix: "oai_dc",
      }),
    /OAI-PMH dates/,
  );
  assert.throws(
    () =>
      oaiPmh.listRecords({
        from: "2026-05-14",
        metadataPrefix: "oai_dc",
        until: "2026-05-15T00:00:00Z",
      }),
    /same OAI-PMH granularity/,
  );
  assert.throws(
    () =>
      oaiPmh.listRecords({
        from: "2026-05-16",
        metadataPrefix: "oai_dc",
        until: "2026-05-15",
      }),
    /from must be earlier/,
  );
});

test("Identify rejects client-supplied arguments", async () => {
  const oaiPmh = new OaiPmh({
    baseUrl: "https://example.org/oai",
    fetch: createMockFetch([]).fetch,
  });

  await assert.rejects(
    () => oaiPmh.identify({ extra: "value" } as never),
    /Identify does not accept/,
  );
});

test("OAI-PMH protocol errors preserve the provider error code", async () => {
  const { fetch } = createMockFetch([new Response(errorXml)]);
  const oaiPmh = new OaiPmh({ baseUrl: "https://example.org/oai", fetch });

  await assert.rejects(
    () => oaiPmh.listMetadataFormats({ identifier: "missing" }),
    (error) => error instanceof OaiPmhError && error.code === "idDoesNotExist",
  );
});

test("deleted records are valid records without metadata", async () => {
  const { fetch } = createMockFetch([new Response(deletedRecordXml)]);
  const oaiPmh = new OaiPmh({ baseUrl: "https://example.org/oai", fetch });

  const response = await oaiPmh.getRecord({
    identifier: "oai:example.org:1",
    metadataPrefix: "oai_dc",
  });

  assert.equal(response.data.header.status, "deleted");
  assert.equal(response.data.metadata, undefined);
});

test("list iteration treats resumption tokens as opaque and stops only on an empty token", async () => {
  const { calls, fetch } = createMockFetch([
    new Response(firstIdentifierPageXml),
    new Response(finalIdentifierPageXml),
  ]);
  const oaiPmh = new OaiPmh({ baseUrl: "https://example.org/oai", fetch });

  const identifiers = [];
  for await (const header of oaiPmh.listIdentifiers({ metadataPrefix: "oai_dc" })) {
    identifiers.push(header.identifier);
  }

  assert.deepEqual(identifiers, ["oai:example.org:1", "oai:example.org:2"]);
  assert.equal(
    calls[1]?.input,
    "https://example.org/oai?verb=ListIdentifiers&resumptionToken=opaque-token",
  );
});

test("HTTP 503 Retry-After is honored before retrying", async () => {
  const { calls, fetch } = createMockFetch([
    new Response("busy", { headers: { "Retry-After": "0" }, status: 503 }),
    new Response(identifyXml),
  ]);
  const oaiPmh = new OaiPmh({
    baseUrl: "https://example.org/oai",
    fetch,
    retry: { maxDelaySeconds: 0, maxRetries: 1, minDelaySeconds: 0 },
  });

  await oaiPmh.identify();

  assert.equal(calls.length, 2);
});

test("CLI renders command help", async () => {
  const cliPath = new URL("../bin/oai-pmh.js", import.meta.url);
  const result = await new Promise<{ code: number | null; output: string }>((resolve) => {
    const child = spawn(process.execPath, [cliPath.pathname, "--help"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
    });
    child.on("close", (code) => {
      resolve({ code, output });
    });
  });

  assert.equal(result.code, 0);
  assert.match(result.output, /list-records/);
});
