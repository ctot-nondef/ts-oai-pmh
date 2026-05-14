![CI](https://github.com/ctot-nondef/ts-oai-pmh/actions/workflows/ci.yml/badge.svg)
[![npm version](https://badge.fury.io/js/@nondef%2Fts-oai-pmh.svg)](https://badge.fury.io/js/@nondef%2Fts-oai-pmh)

# OAI-PMH TypeScript

An ESM-only OAI-PMH 2.0 harvester for Node.js 24 and newer.

The client targets the official OAI-PMH 2.0 protocol:
https://www.openarchives.org/OAI/openarchivesprotocol.html

## Installation

```sh
pnpm add @nondef/ts-oai-pmh
```

## Library Usage

```ts
import { OaiPmh } from "@nondef/ts-oai-pmh";

const oaiPmh = new OaiPmh({
  baseUrl: "https://export.arxiv.org/oai2",
});

const identify = await oaiPmh.identify();
console.log(identify.data.repositoryName);

for await (const header of oaiPmh.listIdentifiers({
  metadataPrefix: "arXiv",
  from: "2020-01-01",
  until: "2020-01-02",
})) {
  console.log(header.identifier);
}
```

## CLI Usage

```sh
oai-pmh identify https://export.arxiv.org/oai2
oai-pmh get-record https://export.arxiv.org/oai2 \
	--identifier oai:arXiv.org:1412.8544 \
	--metadata-prefix arXiv
oai-pmh list-identifiers https://export.arxiv.org/oai2 \
	--metadata-prefix arXiv \
	--from 2020-01-01 \
	--until 2020-01-02
```

List commands emit newline-delimited JSON. Single-response commands emit one formatted JSON document.

## Protocol Behavior

- Supports all six OAI-PMH 2.0 verbs: `Identify`, `GetRecord`, `ListIdentifiers`, `ListMetadataFormats`, `ListRecords`, and `ListSets`.
- Uses HTTP `GET` by default and can use `POST` with `application/x-www-form-urlencoded` via `requestMethod: "POST"`.
- Validates verb-specific argument rules before sending requests.
- Treats resumption tokens as opaque and exclusive.
- Preserves OAI-PMH provider errors as `OaiPmhError` instances with the provider error code.
- Supports OAI-PMH date strings in `YYYY-MM-DD` and `YYYY-MM-DDThh:mm:ssZ` format.

## Development

```sh
pnpm install
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run build
pnpm test
```

Default tests are fixture-based and do not call public OAI-PMH providers.
