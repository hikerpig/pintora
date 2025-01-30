# Change Log

## 0.8.0-alpha.1

### Minor Changes

- d90c1be: Drop support node.js v16
- f4163c7: Add simple StyleEngine in `@pre` block, and `@bindClass` statement to diagrams

### Patch Changes

- Updated dependencies [f4163c7]
  - @pintora/core@0.8.0-alpha.1
  - @pintora/renderer@0.8.0-alpha.1
  - @pintora/standalone@0.8.0-alpha.1

## 0.8.0-alpha.0

### Minor Changes

- f9014a5: Add ability to parse `@pre` block and merge configs

### Patch Changes

- 0b31164: feat: [activity] support quoted word as action message
- 9653ccb: feat: [classDiagram] be able to add `title`
- Updated dependencies [0b31164]
- Updated dependencies [f9014a5]
- Updated dependencies [9653ccb]
  - @pintora/standalone@0.8.0-alpha.0
  - @pintora/core@0.8.0-alpha.0
  - @pintora/renderer@0.8.0-alpha.0

## 0.7.6

### Patch Changes

- 089ca96: update to workspace dependencies
- Updated dependencies [089ca96]
  - @pintora/standalone@0.7.5

## 0.7.4

### Patch Changes

- 4c8346b: feat(cli): add option `renderInSubprocess` to avoid polluting global scope

## 0.7.3

### Patch Changes

- 651b22c: fix: [activityDiagram] missing no-action-line parentId caused layout problem
- d635362: feat: [classDiagram] allow to parse more characters in class member label
- Updated dependencies [651b22c]
- Updated dependencies [d635362]
  - @pintora/standalone@0.7.3

## 0.7.2

### Patch Changes

- e1feba4: fix: multiline note with comma text makes crash some diagrams
- Updated dependencies [e1feba4]
  - @pintora/standalone@0.7.2

## 0.7.1

### Patch Changes

- f1c4c96: fix: [sequenceDiagram] nested loop container bg rect drawing order
- 3984345: should cleanup global pollution after render
- Updated dependencies [f1c4c96]
  - @pintora/standalone@0.7.1

## 0.7.0

### Minor Changes

- 2d1f668: Add classDiagram

### Patch Changes

- Updated dependencies [0a27a38]
- Updated dependencies [4d419a7]
- Updated dependencies [02f7873]
- Updated dependencies [2d1f668]
  - @pintora/core@0.7.0
  - @pintora/renderer@0.7.0
  - @pintora/standalone@0.7.0

## 0.7.0-alpha.0

### Minor Changes

- 2d1f668: Add classDiagram

### Patch Changes

- Updated dependencies [0a27a38]
- Updated dependencies [4d419a7]
- Updated dependencies [2d1f668]
  - @pintora/core@0.7.0-alpha.0
  - @pintora/renderer@0.7.0-alpha.0
  - @pintora/standalone@0.7.0-alpha.0

## 0.6.6

### Patch Changes

- d9fdcdf: Upgrad to node-canvas 2.11.2
- 718e47d: eliminate config side effects of `render` function
- Updated dependencies [718e47d]
  - @pintora/core@0.6.3

## 0.6.5

### Patch Changes

- 4661a7a: Be able to escape `"` inside quoted string
- Updated dependencies [4661a7a]
  - @pintora/standalone@0.6.5

## 0.6.4

### Patch Changes

- 5225305: [componentDiagram] Add a param 'hideGroupType'
- 68e0066: fix: [mindmap] hyphen inside multiline text
- Updated dependencies [68e0066]
  - @pintora/standalone@0.6.4

## 0.6.3

### Patch Changes

- 1be0419: fix: [activity] Incorrect display of forks inside groups
- 09923c5: [activity] fix incorrect display for nested group
- bb18a39: fix: [diagram] make sure diagram title won't be cropped when it's wider than other contents
- Updated dependencies [1be0419]
- Updated dependencies [09923c5]
- Updated dependencies [bb18a39]
  - @pintora/standalone@0.6.3

## 0.6.2

### Patch Changes

- 021988a: fix: [sequenceDiagram] excessive box width bug
- Updated dependencies [72b6b69]
- Updated dependencies [021988a]
  - @pintora/core@0.6.2
  - @pintora/renderer@0.6.1
  - @pintora/standalone@0.6.2

## 0.6.1

### Patch Changes

- 10a5d8d: fix: ReferenceError: CanvasPattern is not defined
- Updated dependencies [10a5d8d]
  - @pintora/core@0.6.1

## 0.6.0

### Minor Changes

- 87f80b1: feat: add dotDiagram

### Patch Changes

- 3e8325c: optimize: adjust er diagram width when minEntityWidth is larger than attributes width sum
- ac510ed: optimize: erDiagram can have '{}' with 0 attributes
- 6174d92: chore: update pintora-renderer deps
- Updated dependencies [3e8325c]
- Updated dependencies [ac510ed]
- Updated dependencies [c9476a7]
- Updated dependencies [6174d92]
- Updated dependencies [87f80b1]
  - @pintora/standalone@0.6.0
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
- Updated dependencies [6174d92]
- Updated dependencies [87f80b1]
  - @pintora/standalone@0.6.0-alpha.0
  - @pintora/renderer@0.6.0-alpha.0
  - @pintora/core@0.6.0-alpha.0

## 0.5.2

### Patch Changes

- 817ce38: feat: add diagram event callback system
- 77ad349: optimize: add @pintora/diagrams/shared-grammars so others can use them
- Updated dependencies [817ce38]
- Updated dependencies [77ad349]
- Updated dependencies [3c75c6a]
  - @pintora/core@0.5.0
  - @pintora/renderer@0.5.0
  - @pintora/standalone@0.5.2

## 0.5.1

### Patch Changes

- 98992e2: optimize: options `getContent()` for `pintora.getContentOf`
- Updated dependencies [98992e2]
  - @pintora/standalone@0.5.1

## 0.5.0

### Minor Changes

- f22f85c: feat: [sequence] add participant boxes
  - fix: actor line start offset

### Patch Changes

- 76d45d5: optimize: improve orthogonal edge by reducing bendpoints under some conditions
- Updated dependencies [35c6103]
- Updated dependencies [f22f85c]
- Updated dependencies [76d45d5]
  - @pintora/standalone@0.5.0

## 0.4.4

### Patch Changes

- f575b91: fix: [activity] group color before quoted sentence
- 30a2f49: optimize: [activity] support repeat loop
- Updated dependencies [f575b91]
- Updated dependencies [30a2f49]
  - @pintora/standalone@0.4.4

## 0.4.3

### Patch Changes

- 3d99b10: feat: [er] parse and draw inheritance to present extended er diagram
- 8216f4d: optimize: [er] can parse and display attribute comment
- Updated dependencies [8216f4d]
  - @pintora/renderer@0.4.1
  - @pintora/standalone@0.4.3

## 0.4.2

### Patch Changes

- 199e096: optimize: [component] pad group node if label is too wide
- fed231e: optimize: [component] consider symbolMargin.margint during layout
- Updated dependencies [fed231e]
  - @pintora/standalone@0.4.2

## 0.4.1

### Patch Changes

- a17ca84: optimize: a not-so-perfect solution to avoid edge crossing with othogonal edges
- 1b71a87: fix: [er] extend graph bounds with relation edge bounds
- Updated dependencies [a17ca84]
- Updated dependencies [1b71a87]
  - @pintora/standalone@0.4.1

## 0.4.0

### Minor Changes

- 5f3c738: **BREAKING** replace `curvedEdge` option with `edgeType` and support orthogonal lines

### Patch Changes

- 5f68ca7: optimize: [gantt] adjust section label to section background vertical center
- c9f6409: optimize: [sequence] apply extraMarginForBox if follows one message drawn with sequence number
- Updated dependencies [5f3c738]
- Updated dependencies [5f68ca7]
- Updated dependencies [c9f6409]
  - @pintora/core@0.4.0
  - @pintora/renderer@0.4.0
  - @pintora/standalone@0.4.0

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
  - @pintora/renderer@0.1.4
  - @pintora/standalone@0.3.0

## 0.3.0-alpha.2

### Patch Changes

- bc16cae: [gantt] add support for axisInterval
- 46a1a9f: [gantt] add support for axisInterval
- Updated dependencies [bc16cae]
- Updated dependencies [46a1a9f]
  - @pintora/core@0.3.0-alpha.2
  - @pintora/renderer@0.1.4-alpha.2
  - @pintora/standalone@0.3.0-alpha.2

## 0.3.0-alpha.1

### Patch Changes

- 235cc0e: add @config and @param to gantt diagram; update tmLanguage;
- Updated dependencies [235cc0e]
  - @pintora/core@0.3.0-alpha.1
  - @pintora/renderer@0.1.4-alpha.1
  - @pintora/standalone@0.3.0-alpha.1

## 0.3.0-alpha.0

### Minor Changes

- bd214c7: Add gantt diagram

### Patch Changes

- Updated dependencies [bd214c7]
  - @pintora/core@0.3.0-alpha.0
  - @pintora/standalone@0.3.0-alpha.0
  - @pintora/renderer@0.1.4-alpha.0

## 0.2.1

### Patch Changes

- 3c4b25a: improve parser performance by eliminating some ambiguity
- Updated dependencies [3c4b25a]
  - @pintora/standalone@0.2.1

## 0.2.0

### Minor Changes

- 540f20c: Add the ability to scale diagram width with `useMaxWidth`, #20

### Patch Changes

- Updated dependencies [540f20c]
  - @pintora/core@0.2.0
  - @pintora/standalone@0.2.0
  - @pintora/renderer@0.1.3

## 0.1.3

### Patch Changes

- 41cb7da: Make diagram grammars more tolerant to spaces (and the lack of them)
- Updated dependencies [41cb7da]
  - @pintora/standalone@0.1.3

## 0.1.2

### Patch Changes

- Change from lerna to pnpm and changesets for better changelog; And optimize grammar rules
- Updated dependencies
  - @pintora/core@0.1.2
  - @pintora/renderer@0.1.2
  - @pintora/standalone@0.1.2

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.1.2-beta.0](https://github.com/hikerpig/pintora/compare/v0.1.1...v0.1.2-beta.0) (2022-02-13)

**Note:** Version bump only for package @pintora/cli

## [0.1.1](https://github.com/hikerpig/pintora/compare/v0.1.0...v0.1.1) (2022-02-12)

**Note:** Version bump only for package @pintora/cli

# [0.1.0](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.27...v0.1.0) (2022-02-06)

**Note:** Version bump only for package @pintora/cli

# [0.1.0-alpha.27](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.25...v0.1.0-alpha.27) (2022-02-06)

**Note:** Version bump only for package @pintora/cli

# [0.1.0-alpha.26](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.25...v0.1.0-alpha.26) (2022-02-05)

**Note:** Version bump only for package @pintora/cli

# [0.1.0-alpha.25](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.24...v0.1.0-alpha.25) (2022-02-03)

**Note:** Version bump only for package @pintora/cli

# [0.1.0-alpha.24](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.23...v0.1.0-alpha.24) (2022-02-01)

**Note:** Version bump only for package @pintora/cli

# [0.1.0-alpha.23](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.21...v0.1.0-alpha.23) (2022-01-30)

**Note:** Version bump only for package @pintora/cli

# [0.1.0-alpha.22](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.21...v0.1.0-alpha.22) (2022-01-27)

**Note:** Version bump only for package @pintora/cli

# [0.1.0-alpha.21](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.20...v0.1.0-alpha.21) (2022-01-25)

**Note:** Version bump only for package @pintora/cli

# [0.1.0-alpha.19](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.18...v0.1.0-alpha.19) (2022-01-22)

**Note:** Version bump only for package @pintora/cli

# [0.1.0-alpha.18](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.17...v0.1.0-alpha.18) (2022-01-16)

### Features

- **pintora-cli:** read cli args `--theme` ([a502c35](https://github.com/hikerpig/pintora/commit/a502c35cf1dbbad65c5847e2752e17711b8dccef))

# [0.1.0-alpha.17](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.16...v0.1.0-alpha.17) (2022-01-15)

### Bug Fixes

- **pintora-cli:** output filename mimetype bug ([54601f6](https://github.com/hikerpig/pintora/commit/54601f639e351100f040f1e22d9beaedb1658b5e))

# [0.1.0-alpha.16](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.15...v0.1.0-alpha.16) (2022-01-15)

**Note:** Version bump only for package @pintora/cli

# [0.1.0-alpha.15](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.14...v0.1.0-alpha.15) (2022-01-05)

**Note:** Version bump only for package @pintora/cli

# [0.1.0-alpha.14](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.13...v0.1.0-alpha.14) (2021-12-30)

**Note:** Version bump only for package @pintora/cli

# [0.1.0-alpha.13](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.12...v0.1.0-alpha.13) (2021-12-15)

### Features

- **pintora-cli:** Add ability to output svg file in cli ([52f1b91](https://github.com/hikerpig/pintora/commit/52f1b912e803fbace13af8ab5a761f4ee446e141))

# [0.1.0-alpha.12](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.11...v0.1.0-alpha.12) (2021-12-11)

**Note:** Version bump only for package @pintora/cli

# [0.1.0-alpha.11](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.10...v0.1.0-alpha.11) (2021-12-04)

**Note:** Version bump only for package @pintora/cli

# [0.1.0-alpha.10](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.9...v0.1.0-alpha.10) (2021-09-07)

**Note:** Version bump only for package @pintora/cli

# [0.1.0-alpha.9](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.8...v0.1.0-alpha.9) (2021-09-05)

**Note:** Version bump only for package @pintora/cli

# [0.1.0-alpha.8](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.7...v0.1.0-alpha.8) (2021-08-29)

**Note:** Version bump only for package @pintora/cli

# [0.1.0-alpha.7](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.6...v0.1.0-alpha.7) (2021-08-24)

**Note:** Version bump only for package @pintora/cli

# [0.1.0-alpha.6](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.5...v0.1.0-alpha.6) (2021-08-21)

**Note:** Version bump only for package @pintora/cli

# [0.1.0-alpha.5](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.4...v0.1.0-alpha.5) (2021-08-16)

**Note:** Version bump only for package @pintora/cli

# [0.1.0-alpha.4](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.3...v0.1.0-alpha.4) (2021-08-15)

**Note:** Version bump only for package @pintora/cli

# [0.1.0-alpha.3](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.2...v0.1.0-alpha.3) (2021-08-07)

**Note:** Version bump only for package @pintora/cli

# [0.1.0-alpha.2](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.1...v0.1.0-alpha.2) (2021-08-07)

**Note:** Version bump only for package @pintora/cli

# [0.1.0-alpha.1](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.0...v0.1.0-alpha.1) (2021-08-01)

**Note:** Version bump only for package @pintora/cli

# [0.1.0-alpha.0](https://github.com/hikerpig/pintora/compare/v0.0.1...v0.1.0-alpha.0) (2021-08-01)

**Note:** Version bump only for package @pintora/cli
