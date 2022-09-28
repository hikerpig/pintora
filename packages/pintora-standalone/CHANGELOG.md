# Change Log

## 0.6.2

### Patch Changes

- 72b6b69: fix: ts `--isolatedModules` related issues
- 021988a: fix: [sequenceDiagram] excessive box width bug
- Updated dependencies [8fc0bce]
- Updated dependencies [72b6b69]
- Updated dependencies [021988a]
  - @pintora/diagrams@0.6.2
  - @pintora/core@0.6.2
  - @pintora/renderer@0.6.1

## 0.6.0

### Minor Changes

- 87f80b1: feat: add dotDiagram

### Patch Changes

- 3e8325c: optimize: adjust er diagram width when minEntityWidth is larger than attributes width sum
- ac510ed: optimize: erDiagram can have '{}' with 0 attributes
- 6174d92: chore: update pintora-renderer deps
- Updated dependencies [3e8325c]
- Updated dependencies [ac510ed]
- Updated dependencies [9b8785d]
- Updated dependencies [a997bee]
- Updated dependencies [bbc9fb0]
- Updated dependencies [240e0af]
- Updated dependencies [c9476a7]
- Updated dependencies [426f251]
- Updated dependencies [9385a0f]
- Updated dependencies [beecc00]
- Updated dependencies [6174d92]
- Updated dependencies [d5c27a1]
- Updated dependencies [87f80b1]
  - @pintora/diagrams@0.6.0
  - @pintora/core@0.6.0
  - @pintora/renderer@0.6.0

## 0.6.0-alpha.0

### Minor Changes

- 87f80b1: feat: add dotDiagram

### Patch Changes

- 3e8325c: optimize: adjust er diagram width when minEntityWidth is larger than attributes width sum
- ac510ed: optimize: erDiagram can have '{}' with 0 attributes
- 6174d92: chore: update pintora-renderer deps
- Updated dependencies [3e8325c]
- Updated dependencies [ac510ed]
- Updated dependencies [9b8785d]
- Updated dependencies [6174d92]
- Updated dependencies [87f80b1]
  - @pintora/diagrams@0.6.0-alpha.0
  - @pintora/renderer@0.6.0-alpha.0
  - @pintora/core@0.6.0-alpha.0

## 0.5.2

### Patch Changes

- 817ce38: feat: add diagram event callback system
- 77ad349: optimize: add @pintora/diagrams/shared-grammars so others can use them
- 3c75c6a: feat: change @pintora/core export shapes
- Updated dependencies [3c75c6a]
  - @pintora/core@0.5.0
  - @pintora/renderer@0.5.0
  - @pintora/diagrams@0.5.2

## 0.5.1

### Patch Changes

- 98992e2: optimize: options `getContent()` for `pintora.getContentOf`
- Updated dependencies [fc12ccb]
  - @pintora/diagrams@0.5.1

## 0.5.0

### Minor Changes

- f22f85c: feat: [sequence] add participant boxes
  - fix: actor line start offset

### Patch Changes

- 35c6103: optimize: add method `pintoraStandalone.getConfigFromElement`
- 76d45d5: optimize: improve orthogonal edge by reducing bendpoints under some conditions
- Updated dependencies [87ad4ab]
- Updated dependencies [76d45d5]
  - @pintora/diagrams@0.5.0

## 0.4.4

### Patch Changes

- f575b91: fix: [activity] group color before quoted sentence
- 30a2f49: optimize: [activity] support repeat loop
- Updated dependencies [f575b91]
- Updated dependencies [30a2f49]
  - @pintora/diagrams@0.4.4

## 0.4.3

### Patch Changes

- 3d99b10: feat: [er] parse and draw inheritance to present extended er diagram
- 8216f4d: optimize: [er] can parse and display attribute comment
- Updated dependencies [3d99b10]
- Updated dependencies [8216f4d]
  - @pintora/diagrams@0.4.3
  - @pintora/renderer@0.4.1

## 0.4.2

### Patch Changes

- 199e096: optimize: [component] pad group node if label is too wide
- fed231e: optimize: [component] consider symbolMargin.margint during layout
- Updated dependencies [199e096]
- Updated dependencies [fed231e]
  - @pintora/diagrams@0.4.2

## 0.4.1

### Patch Changes

- a17ca84: optimize: a not-so-perfect solution to avoid edge crossing with othogonal edges
- 1b71a87: fix: [er] extend graph bounds with relation edge bounds
- Updated dependencies [a17ca84]
- Updated dependencies [1b71a87]
  - @pintora/diagrams@0.4.1

## 0.4.0

### Minor Changes

- 5f3c738: **BREAKING** replace `curvedEdge` option with `edgeType` and support orthogonal lines

### Patch Changes

- 5f68ca7: optimize: [gantt] adjust section label to section background vertical center
- c9f6409: optimize: [sequence] apply extraMarginForBox if follows one message drawn with sequence number
- Updated dependencies [5f3c738]
- Updated dependencies [71c84d1]
- Updated dependencies [5f68ca7]
- Updated dependencies [5271156]
- Updated dependencies [c9f6409]
  - @pintora/diagrams@0.4.0
  - @pintora/core@0.4.0
  - @pintora/renderer@0.4.0

## 0.3.0

### Minor Changes

- 634affd: Add gantt diagram

### Patch Changes

- 634affd: add @config and @param to gantt diagram; update tmLanguage;
- 634affd: [gantt] add support for axisInterval
- 634affd: [gantt] add support for axisInterval
- Updated dependencies [634affd]
- Updated dependencies [634affd]
- Updated dependencies [634affd]
- Updated dependencies [634affd]
  - @pintora/core@0.3.0
  - @pintora/diagrams@0.3.0
  - @pintora/renderer@0.1.4

## 0.3.0-alpha.2

### Patch Changes

- bc16cae: [gantt] add support for axisInterval
- 46a1a9f: [gantt] add support for axisInterval
- Updated dependencies [bc16cae]
- Updated dependencies [46a1a9f]
  - @pintora/core@0.3.0-alpha.2
  - @pintora/diagrams@0.3.0-alpha.2
  - @pintora/renderer@0.1.4-alpha.2

## 0.3.0-alpha.1

### Patch Changes

- 235cc0e: add @config and @param to gantt diagram; update tmLanguage;
- Updated dependencies [235cc0e]
  - @pintora/core@0.3.0-alpha.1
  - @pintora/diagrams@0.3.0-alpha.1
  - @pintora/renderer@0.1.4-alpha.1

## 0.3.0-alpha.0

### Minor Changes

- bd214c7: Add gantt diagram

### Patch Changes

- Updated dependencies [bd214c7]
  - @pintora/core@0.3.0-alpha.0
  - @pintora/diagrams@0.3.0-alpha.0
  - @pintora/renderer@0.1.4-alpha.0

## 0.2.1

### Patch Changes

- 3c4b25a: improve parser performance by eliminating some ambiguity
- Updated dependencies [3c4b25a]
  - @pintora/diagrams@0.2.1

## 0.2.0

### Minor Changes

- 540f20c: Add the ability to scale diagram width with `useMaxWidth`, #20

## 0.1.3

### Patch Changes

- 41cb7da: Make diagram grammars more tolerant to spaces (and the lack of them)

## 0.1.2

### Patch Changes

- Change from lerna to pnpm and changesets for better changelog; And optimize grammar rules
- Updated dependencies
  - @pintora/core@0.1.2
  - @pintora/diagrams@0.1.2
  - @pintora/renderer@0.1.2

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.1.2-beta.0](https://github.com/hikerpig/pintora/compare/v0.1.1...v0.1.2-beta.0) (2022-02-13)

**Note:** Version bump only for package @pintora/standalone

## [0.1.1](https://github.com/hikerpig/pintora/compare/v0.1.0...v0.1.1) (2022-02-12)

**Note:** Version bump only for package @pintora/standalone

# [0.1.0](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.27...v0.1.0) (2022-02-06)

### Features

- now we can override themeConfig with `[@config](https://github.com/config)` clause ([14420ce](https://github.com/hikerpig/pintora/commit/14420ce40b0eed03eaaedd6fa88980a227b3d0b0))

# [0.1.0-alpha.27](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.25...v0.1.0-alpha.27) (2022-02-06)

**Note:** Version bump only for package @pintora/standalone

# [0.1.0-alpha.26](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.25...v0.1.0-alpha.26) (2022-02-05)

**Note:** Version bump only for package @pintora/standalone

# [0.1.0-alpha.25](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.24...v0.1.0-alpha.25) (2022-02-03)

**Note:** Version bump only for package @pintora/standalone

# [0.1.0-alpha.24](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.23...v0.1.0-alpha.24) (2022-02-01)

**Note:** Version bump only for package @pintora/standalone

# [0.1.0-alpha.23](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.21...v0.1.0-alpha.23) (2022-01-30)

**Note:** Version bump only for package @pintora/standalone

# [0.1.0-alpha.22](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.21...v0.1.0-alpha.22) (2022-01-27)

### Features

- **pintora-core:** move themeRegistry to @pintora/core ([aa3e4c9](https://github.com/hikerpig/pintora/commit/aa3e4c92446f6c6af4177821f995cd7f86e30da5))
- **pintora-standalone:** assign temp config in `renderTo` method ([85d4c4a](https://github.com/hikerpig/pintora/commit/85d4c4adf72199aa1ef4732fac08cf1d30e31f7c))

# [0.1.0-alpha.21](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.20...v0.1.0-alpha.21) (2022-01-25)

**Note:** Version bump only for package @pintora/standalone

# [0.1.0-alpha.19](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.18...v0.1.0-alpha.19) (2022-01-22)

### Features

- **pintora-diagrams:** add mindmap support ([3062216](https://github.com/hikerpig/pintora/commit/306221660b34baad83d67435470d6aabc27b289f))

# [0.1.0-alpha.18](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.17...v0.1.0-alpha.18) (2022-01-16)

### Features

- **pintora-core:** PintoraConfig can now be type augmented ([c6167cb](https://github.com/hikerpig/pintora/commit/c6167cbfa22b5e96610c6601007eca64a8d18450))

# [0.1.0-alpha.16](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.15...v0.1.0-alpha.16) (2022-01-15)

### Features

- add method `registerTheme` ([8302e56](https://github.com/hikerpig/pintora/commit/8302e5660d226ac9458d6a6cd9a54fecf4f84b9d))

# [0.1.0-alpha.15](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.14...v0.1.0-alpha.15) (2022-01-05)

**Note:** Version bump only for package @pintora/standalone

# [0.1.0-alpha.14](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.13...v0.1.0-alpha.14) (2021-12-30)

**Note:** Version bump only for package @pintora/standalone

# [0.1.0-alpha.13](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.12...v0.1.0-alpha.13) (2021-12-15)

**Note:** Version bump only for package @pintora/standalone

# [0.1.0-alpha.12](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.11...v0.1.0-alpha.12) (2021-12-11)

**Note:** Version bump only for package @pintora/standalone

# [0.1.0-alpha.11](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.10...v0.1.0-alpha.11) (2021-12-04)

**Note:** Version bump only for package @pintora/standalone

# [0.1.0-alpha.10](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.9...v0.1.0-alpha.10) (2021-09-07)

**Note:** Version bump only for package @pintora/standalone

# [0.1.0-alpha.9](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.8...v0.1.0-alpha.9) (2021-09-05)

**Note:** Version bump only for package @pintora/standalone

# [0.1.0-alpha.8](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.7...v0.1.0-alpha.8) (2021-08-29)

**Note:** Version bump only for package @pintora/standalone

# [0.1.0-alpha.7](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.6...v0.1.0-alpha.7) (2021-08-24)

**Note:** Version bump only for package @pintora/standalone

# [0.1.0-alpha.6](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.5...v0.1.0-alpha.6) (2021-08-21)

**Note:** Version bump only for package @pintora/standalone

# [0.1.0-alpha.5](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.4...v0.1.0-alpha.5) (2021-08-16)

**Note:** Version bump only for package @pintora/standalone

# [0.1.0-alpha.4](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.3...v0.1.0-alpha.4) (2021-08-15)

### Bug Fixes

- **pintora-diagrams:** [componentDiagram] avoid interface node overlapping ([213cea0](https://github.com/hikerpig/pintora/commit/213cea090f40717390417e143366026d841f9808))

# [0.1.0-alpha.3](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.2...v0.1.0-alpha.3) (2021-08-07)

### Features

- setConfig `core.defaultRenderer` ([d6bc00c](https://github.com/hikerpig/pintora/commit/d6bc00c1335f8fde74c5f967fac4d3a36fb429ea))

# [0.1.0-alpha.2](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.1...v0.1.0-alpha.2) (2021-08-07)

### Features

- **pintora-demo:** ConfigEditor in live-editor ([973f07b](https://github.com/hikerpig/pintora/commit/973f07baf282fe0e13df37cf75a0e71d0d70a321))
- **pintora-demo:** sync config to preview ([c8a9392](https://github.com/hikerpig/pintora/commit/c8a939200b69de8826ccb6973db96ce4b94250f5))
- **pintora-diagrams:** adjust diagram colors with dark theme ([72d3720](https://github.com/hikerpig/pintora/commit/72d37207f6e125ba354997b956d53c6d0e3528eb))

# [0.1.0-alpha.1](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.0...v0.1.0-alpha.1) (2021-08-01)

### Features

- basic theme for current diagrams ([f5d1332](https://github.com/hikerpig/pintora/commit/f5d133274d55bbd0414ed9b706d831e43e56e2b4))

# [0.1.0-alpha.0](https://github.com/hikerpig/pintora/compare/v0.0.1...v0.1.0-alpha.0) (2021-08-01)

### Features

- **pintora-standalone:** `pintora.setConfig` ([ad59e8b](https://github.com/hikerpig/pintora/commit/ad59e8b60f3c7ae2fdbf01fede70e258991dbc0d))
