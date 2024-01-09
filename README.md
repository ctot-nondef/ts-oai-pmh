![Test & Deploy](https://github.com/ctot-nondef/ts-oai-pmh/actions/workflows/testandpublish.yml/badge.svg)
[![codecov](https://codecov.io/gh/ctot-nondef/ts-oai-pmh/graph/badge.svg?token=R6YMXD6ONZ)](https://codecov.io/gh/ctot-nondef/ts-oai-pmh)
[![npm version](https://badge.fury.io/js/@nondef%2Fts-oai-pmh.svg)](https://badge.fury.io/js/@nondef%2Fts-oai-pmh)

# OAI PMH Typescript

A TypeScript module for the Open Archives Initiative Protocol for Metadata Harvesting
([OAI-PMH 2.0](http://www.openarchives.org/OAI/openarchivesprotocol.html)). Use this module if you
want to harvest metadata from OAI-PMH providers, e.g., [arxiv](http://arxiv.org/).

# Installation

```
npm install oai-pmh
```

# Basic usage

## As typescript library

```typescript
const oaiPmh = new OaiPmh(
	"http://bibsys-network.alma.exlibrisgroup.com/view/oai/47BIBSYS_NETWORK/request" as unknown as URL,
);
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
```

For details see the [documentation](https://ctot-nondef.github.io/ts-oai-pmh/)

## Through CLI

to be done
