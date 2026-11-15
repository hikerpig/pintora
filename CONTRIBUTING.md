Thanks for showing interest to contribute to pintora 💓.

## Overview

Project directories of this monorepo:

```text
pintora
├── package.json
├── packages
│   ├── development-kit # some wrapper methods for compiling grammars
│   ├── pintora-cli # node.js cli
│   ├── pintora-core # core type defs and registries
│   ├── pintora-diagrams # buitin diagrams, most of the code goes here
│   ├── pintora-renderer # svg and canvas renderer
│   ├── pintora-standalone # main API, wiring up all buitin diagrams and renderers and the core registry
│   └── test-shared # develop only, some example data
├── demo # a vite project for demo pages, including live-editor and preview
│   └── vite.config.ts
└── website # a docusaurus project for doc site
    └── docusaurus.config.js
```

Run this command to better understand the package dependencies.

```sh
pnpm exec turbo run compile --graph=dep-graph.html
```

## Development

### Tooling

- Node.js 26 (see `.node-version`)
- [pnpm](https://pnpm.io/) as package manager.
- [turborepo](https://turborepo.org/) to build packages. The cache system works well with Vercel deployments.
- [Changeset](https://github.com/atlassian/changesets) for changes documentation, changelog generation, and release management.


### Setup

Install using pnpm, and some postinstall scripts will be executed.

```sh
pnpm i
```

### Start the demo

Currently we need two shells to develop the live-editor demo.

1. Watch packages.

```sh
./scripts/watch-for-browser.sh
```

2. Start the demo. When the CLI stops rolling, open `https://localhost:3001/demo/live-editor/` in
   your browser and you will see the editor page. It will reload once `demo/src` or its dependency packages change.

```sh
pnpm run demo:dev
```

### Build

Compile all packages, ready for publishing.

```sh
pnpm run compile
```

Build demo and docs site.

```sh
pnpm run build-site
```
