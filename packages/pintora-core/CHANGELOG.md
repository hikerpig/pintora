# Change Log

## 0.7.0-alpha.0

### Minor Changes

- 2d1f668: Add classDiagram

### Patch Changes

- 0a27a38: Be able to inject text-metric calculator in case there is no Canvas impl in the environment.

## 0.6.3

### Patch Changes

- 718e47d: eliminate config side effects of `render` function

## 0.6.2

### Patch Changes

- 72b6b69: fix: ts `--isolatedModules` related issues

## 0.6.1

### Patch Changes

- 10a5d8d: fix: ReferenceError: CanvasPattern is not defined

## 0.6.0

### Minor Changes

- 87f80b1: feat: add dotDiagram

### Patch Changes

- c9476a7: feat: [dotDiagram] more attributes; and default theme canvasBackground is now white

  - add arrowhead shape and bg color
  - add font family and size

## 0.6.0-alpha.1

### Patch Changes

- c9476a7: feat: [dotDiagram] more attributes; and default theme canvasBackground is now white

  - add arrowhead shape and bg color
  - add font family and size

## 0.6.0-alpha.0

### Minor Changes

- 87f80b1: feat: add dotDiagram

## 0.5.0

### Minor Changes

- 817ce38: feat: add diagram event callback system
- 3c75c6a: feat: change @pintora/core export shapes

## 0.4.1

### Patch Changes

- d4895eb: optimize: graphic ir docs

## 0.4.0

### Minor Changes

- 5f3c738: **BREAKING** replace `curvedEdge` option with `edgeType` and support orthogonal lines

## 0.3.0

### Minor Changes

- 634affd: Add gantt diagram

### Patch Changes

- 634affd: add @config and @param to gantt diagram; update tmLanguage;
- 634affd: [gantt] add support for axisInterval
- 634affd: [gantt] add support for axisInterval

## 0.3.0-alpha.2

### Patch Changes

- bc16cae: [gantt] add support for axisInterval
- 46a1a9f: [gantt] add support for axisInterval

## 0.3.0-alpha.1

### Patch Changes

- 235cc0e: add @config and @param to gantt diagram; update tmLanguage;

## 0.3.0-alpha.0

### Minor Changes

- bd214c7: Add gantt diagram

## 0.2.0

### Minor Changes

- 540f20c: Add the ability to scale diagram width with `useMaxWidth`, #20

## 0.1.2

### Patch Changes

- Change from lerna to pnpm and changesets for better changelog; And optimize grammar rules

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.1.0](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.27...v0.1.0) (2022-02-06)

### Features

- now we can override themeConfig with `[@config](https://github.com/config)` clause ([14420ce](https://github.com/hikerpig/pintora/commit/14420ce40b0eed03eaaedd6fa88980a227b3d0b0))

# [0.1.0-alpha.25](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.24...v0.1.0-alpha.25) (2022-02-03)

**Note:** Version bump only for package @pintora/core

# [0.1.0-alpha.23](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.21...v0.1.0-alpha.23) (2022-01-30)

### Bug Fixes

- **pintora-diagrams:** [activityDiagram] should draw nested groups correctly ([720dfe5](https://github.com/hikerpig/pintora/commit/720dfe5a4203e03ff055faa5a1144170867edbcd))

### Features

- **pintora-core:** configApi.setConfig, replace array instead of merging ([f6f5b24](https://github.com/hikerpig/pintora/commit/f6f5b24ae941d2400f965e349e30d6dfee764bda))
- **pintora-diagrams:** set default font family ([d5bab84](https://github.com/hikerpig/pintora/commit/d5bab84506956a69791508a6ba1fd45a0a297943))

# [0.1.0-alpha.22](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.21...v0.1.0-alpha.22) (2022-01-27)

### Features

- **pintora-core:** configApi.setConfig, replace array instead of merging ([f6f5b24](https://github.com/hikerpig/pintora/commit/f6f5b24ae941d2400f965e349e30d6dfee764bda))
- **pintora-core:** move themeRegistry to @pintora/core ([aa3e4c9](https://github.com/hikerpig/pintora/commit/aa3e4c92446f6c6af4177821f995cd7f86e30da5))
- **pintora-standalone:** assign temp config in `renderTo` method ([85d4c4a](https://github.com/hikerpig/pintora/commit/85d4c4adf72199aa1ef4732fac08cf1d30e31f7c))

# [0.1.0-alpha.19](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.18...v0.1.0-alpha.19) (2022-01-22)

### Features

- **pintora-diagrams:** add mindmap support ([3062216](https://github.com/hikerpig/pintora/commit/306221660b34baad83d67435470d6aabc27b289f))

# [0.1.0-alpha.18](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.17...v0.1.0-alpha.18) (2022-01-16)

### Features

- **pintora-core:** PintoraConfig can now be type augmented ([c6167cb](https://github.com/hikerpig/pintora/commit/c6167cbfa22b5e96610c6601007eca64a8d18450))

# [0.1.0-alpha.15](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.14...v0.1.0-alpha.15) (2022-01-05)

### Features

- **pintora-diagrams:** add curvedEdge config and path interpolation for activity and er ([6699808](https://github.com/hikerpig/pintora/commit/66998089a1c64b0cb7769f0cf54472b8bad3b050))

# [0.1.0-alpha.14](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.13...v0.1.0-alpha.14) (2021-12-30)

**Note:** Version bump only for package @pintora/core

# [0.1.0-alpha.11](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.10...v0.1.0-alpha.11) (2021-12-04)

### Bug Fixes

- **pintora-diagrams:** marker direction calculation in sequenceDiagram ([91a783c](https://github.com/hikerpig/pintora/commit/91a783c5085739ddd6bde364aa31f4984ca46753))

### Features

- **pintora-diagrams:** Add basic activityDiagram [#3](https://github.com/hikerpig/pintora/issues/3) ([718a80e](https://github.com/hikerpig/pintora/commit/718a80e55d209d618fb855a463a151b880bf6fc3))

# [0.1.0-alpha.9](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.8...v0.1.0-alpha.9) (2021-09-05)

### Features

- **pintora-diagrams:** [sequenceDiagram] participant with classifier symbol ([0372a29](https://github.com/hikerpig/pintora/commit/0372a2941342a6834e9edb98dada87cd8ee51b6e))

# [0.1.0-alpha.8](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.7...v0.1.0-alpha.8) (2021-08-29)

### Features

- custom style engine and `[@style](https://github.com/style)` rule in erDiagram ([564af61](https://github.com/hikerpig/pintora/commit/564af616b3e5c808155506cbb05f0a8d5e882b85))
- custom style engine and `[@style](https://github.com/style)` rule in sequenceDiagram ([1bf902c](https://github.com/hikerpig/pintora/commit/1bf902cd1bbf79108e68ec8010604e3fb17904ff))

# [0.1.0-alpha.7](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.6...v0.1.0-alpha.7) (2021-08-24)

**Note:** Version bump only for package @pintora/core

# [0.1.0-alpha.6](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.5...v0.1.0-alpha.6) (2021-08-21)

**Note:** Version bump only for package @pintora/core

# [0.1.0-alpha.4](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.3...v0.1.0-alpha.4) (2021-08-15)

### Bug Fixes

- **pintora-diagrams:** [componentDiagram] avoid interface node overlapping ([213cea0](https://github.com/hikerpig/pintora/commit/213cea090f40717390417e143366026d841f9808))

### Features

- support symbols as content wrapper in component diagram ([afdaf69](https://github.com/hikerpig/pintora/commit/afdaf6964d09c9b8f2bb5fd28a173f19120415f6))

# [0.1.0-alpha.3](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.2...v0.1.0-alpha.3) (2021-08-07)

**Note:** Version bump only for package @pintora/core

# [0.1.0-alpha.2](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.1...v0.1.0-alpha.2) (2021-08-07)

### Features

- **pintora-demo:** sync config to preview ([c8a9392](https://github.com/hikerpig/pintora/commit/c8a939200b69de8826ccb6973db96ce4b94250f5))

# [0.1.0-alpha.1](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.0...v0.1.0-alpha.1) (2021-08-01)

### Features

- basic theme for current diagrams ([f5d1332](https://github.com/hikerpig/pintora/commit/f5d133274d55bbd0414ed9b706d831e43e56e2b4))

# [0.1.0-alpha.0](https://github.com/hikerpig/pintora/compare/v0.0.1...v0.1.0-alpha.0) (2021-08-01)

### Features

- **pintora-standalone:** `pintora.setConfig` ([ad59e8b](https://github.com/hikerpig/pintora/commit/ad59e8b60f3c7ae2fdbf01fede70e258991dbc0d))
- Add componentDiagram ([c967f1c](https://github.com/hikerpig/pintora/commit/c967f1c9a969a813adac9a9967a06a024f04d73f))
