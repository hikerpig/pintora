# Change Log

## 0.8.0-alpha.1

### Minor Changes

- d90c1be: Drop support node.js v16
- f4163c7: Add simple StyleEngine in `@pre` block, and `@bindClass` statement to diagrams

### Patch Changes

## 0.8.0-alpha.0

### Minor Changes

- f9014a5: Add ability to parse `@pre` block and merge configs

### Patch Changes

- 0b31164: feat: [activity] support quoted word as action message
- 0abf2d5: fix mindmap color
- 9653ccb: feat: [classDiagram] be able to add `title`
- 417afeb: fix: parse texts prefix with `#`

## 0.7.6

### Patch Changes

- 089ca96: update to workspace dependencies

## 0.7.5

### Patch Changes

- f06dfd0: fix: [activity] strange corner whene condition is inside while
- 3082c5c: feat: [sequence] add `participantBorderColor` param

## 0.7.4

### Patch Changes

- 4c8346b: feat(cli): add option `renderInSubprocess` to avoid polluting global scope
- d3cf8e5: fix: [activityDiagram] wrong condition else label
- eab28e6: feat: [diagrams] modify local `themeConfig` through `@config` directive to change noteBackground

## 0.7.3

### Patch Changes

- 651b22c: fix: [activityDiagram] missing no-action-line parentId caused layout problem
- d635362: feat: [classDiagram] allow to parse more characters in class member label

## 0.7.2

### Patch Changes

- e1feba4: fix: multiline note with comma text makes crash some diagrams

## 0.7.1

### Patch Changes

- f1c4c96: fix: [sequenceDiagram] nested loop container bg rect drawing order
- 3984345: should cleanup global pollution after render

## 0.7.0

### Breaking Changes

- b180922: feat!: support more characters inside multiline notes

### Minor Changes

- 2d1f668: Add classDiagram

### Patch Changes

- 3457b22: feat(diagrams): [activity] Should draw a no-action-line when there is no else block
- a5d289b: fix: classDiagram relation direction, and add docs
- bc811d0: feat(diagrams): [classDiagram] more comfort entity table sizing
- 2df9693: [sequenceDiagram] remove unnecessary stroke in message text
- 23a0053: [classDiagram] render `{static}` and `{abstract}`
- 3a539be: feat: [classDiagram] add a prude implementation of note
- Updated dependencies [0a27a38]
- Updated dependencies [2d1f668]
  - @pintora/core@0.7.0

## 0.7.0-alpha.1

### Patch Changes

- a5d289b: fix: classDiagram relation direction, and add docs
- 2df9693: [sequenceDiagram] remove unnecessary stroke in message text

## 0.7.0-alpha.0

### Minor Changes

- 2d1f668: Add classDiagram

### Patch Changes

- 0a27a38: Be able to inject text-metric calculator in case there is no Canvas impl in the environment.
- 4d419a7: feat: build standalone with esbuild
- Updated dependencies [0a27a38]
- Updated dependencies [2d1f668]
  - @pintora/core@0.7.0-alpha.0

## 0.6.5

### Patch Changes

- 4661a7a: Be able to escape `"` inside quoted string

## 0.6.4

### Patch Changes

- 5225305: [componentDiagram] Add a param 'hideGroupType'
- 68e0066: fix: [mindmap] hyphen inside multiline text

## 0.6.3

### Patch Changes

- 1be0419: fix: [activity] Incorrect display of forks inside groups
- 09923c5: [activity] fix incorrect display for nested group
- bb18a39: fix: [diagram] make sure diagram title won't be cropped when it's wider than other contents

## 0.6.2

### Patch Changes

- 8fc0bce: feat: support `title: text` for diagram title
- 72b6b69: fix: ts `--isolatedModules` related issues
- 021988a: fix: [sequenceDiagram] excessive box width bug

## 0.6.1

### Patch Changes

- f1b6941: fix: [dotDiagram] diamond shape rendering in canvas
- 10a5d8d: fix: ReferenceError: CanvasPattern is not defined

## 0.6.0

### Minor Changes

- 87f80b1: feat: add dotDiagram

### Patch Changes

- 3e8325c: optimize: adjust er diagram width when minEntityWidth is larger than attributes width sum
- ac510ed: optimize: erDiagram can have '{}' with 0 attributes
- 9b8785d: optimize: [componentDiagram] `component "desc" as alias`
- a997bee: feat: [dotDiagra] some common node shapes
- bbc9fb0: optimize: [dotDiagram] edge and node border style
- 240e0af: optimize: [sequence] classifier fallback if there is no symbol icon
- c9476a7: feat: [dotDiagram] more attributes; and default theme canvasBackground is now white
  - add arrowhead shape and bg color
  - add font family and size
- 426f251: feat: [dotDiagram] add a shorthand node grammar
- 9385a0f: optimize: dot subgraph should have a min width of its label
- beecc00: fix: [sequence] actor order bug, #127
- d5c27a1: optimize: [dotDiagram] support edge between subgraph and node, update test data
- Updated dependencies [c9476a7]
- Updated dependencies [87f80b1]
  - @pintora/core@0.6.0

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
- 87ad4ab: optimize: [activity] support ortho edgeType
- Updated dependencies [f22f85c]
- Updated dependencies [76d45d5]
  - @pintora/diagrams@0.5.0

## 0.4.4

### Patch Changes

- f575b91: fix: [activity] group color before quoted sentence
- 30a2f49: optimize: [activity] support repeat loop

## 0.4.3

### Patch Changes

- 3d99b10: feat: [er] parse and draw inheritance to present extended er diagram
- 8216f4d: optimize: [er] can parse and display attribute comment

## 0.4.2

### Patch Changes

- 199e096: optimize: [component] pad group node if label is too wide
- fed231e: optimize: [component] consider symbolMargin.margint during layout

## 0.4.1

### Patch Changes

- a17ca84: optimize: a not-so-perfect solution to avoid edge crossing with othogonal edges
- 1b71a87: fix: [er] extend graph bounds with relation edge bounds

## 0.4.0

### Minor Changes

- 5f3c738: **BREAKING** replace `curvedEdge` option with `edgeType` and support orthogonal lines

### Patch Changes

- 5f68ca7: optimize: [gantt] adjust section label to section background vertical center
- c9f6409: optimize: [sequence] apply extraMarginForBox if follows one message drawn with sequence number

## 0.3.0

### Minor Changes

- 634affd: Add gantt diagram

### Patch Changes

- 634affd: add @config and @param to gantt diagram; update tmLanguage;
- 634affd: [gantt] add support for axisInterval

## 0.2.0

### Minor Changes

- 540f20c: Add the ability to scale diagram width with `useMaxWidth`, #20

### Patch Changes

- Updated dependencies [540f20c]
  - @pintora/core@0.2.0
  - @pintora/diagrams@0.2.0
  - @pintora/renderer@0.1.3

## [0.1.2](https://github.com/hikerpig/pintora/compare/v0.1.1...v0.1.2) (2022-02-13)


### Bug Fixes

* should support `\r` as end-of-line char and whitespace char ([f0696f4](https://github.com/hikerpig/pintora/commit/f0696f48dcb2e82b7368b8a2908dc938b6c3aea2))

### Maintainance

* Use pnpm and changesets instead of npm and lerna for better package management and changelog generation


## [0.1.1](https://github.com/hikerpig/pintora/compare/v0.1.0...v0.1.1) (2022-02-12)


### Bug Fixes

* **pintora-diagrams:** [erDiagram] allow trailing spaces ([ff1ef0c](https://github.com/hikerpig/pintora/commit/ff1ef0cf3f57de692659ce9a3f15f002691557e6))





# [0.1.0](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.27...v0.1.0) (2022-02-06)


### Features

* now we can override themeConfig with `[@config](https://github.com/config)` clause ([14420ce](https://github.com/hikerpig/pintora/commit/14420ce40b0eed03eaaedd6fa88980a227b3d0b0))





# [0.1.0-alpha.27](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.25...v0.1.0-alpha.27) (2022-02-06)


### Features

* **pintora-diagrams:** add new `[@config](https://github.com/config)` directive, rename the old to `[@param](https://github.com/param)` ([4f47693](https://github.com/hikerpig/pintora/commit/4f476936567716de29681df35c8f578cc9aa81cb))
* **pintora-website:** add shiki highlight to preview ([7937abc](https://github.com/hikerpig/pintora/commit/7937abc34f990e2810b0f06a7831471eb78949e0))





# [0.1.0-alpha.26](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.25...v0.1.0-alpha.26) (2022-02-05)


### Features

* **pintora-diagrams:** add new `[@config](https://github.com/config)` directive, rename the old to `[@param](https://github.com/param)` ([0ca092e](https://github.com/hikerpig/pintora/commit/0ca092e097849e42c689cc25f4b856ef5c212fa5))





# [0.1.0-alpha.25](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.24...v0.1.0-alpha.25) (2022-02-03)


### Features

* **pintora-diagrams:** [activityDiagram] can end early ([24050a1](https://github.com/hikerpig/pintora/commit/24050a1966b72dc2a0d9a7efed04804966c812dd))
* **pintora-diagrams:** [activityDiagram] detach and kill ([1045693](https://github.com/hikerpig/pintora/commit/104569377f42496c6a88ef06e6202ccddeca2992))
* **pintora-diagrams:** support line comment that starts with '%%' ([de3e9e1](https://github.com/hikerpig/pintora/commit/de3e9e1e74465fdd8aec11374b4335363c7b8570))





# [0.1.0-alpha.24](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.23...v0.1.0-alpha.24) (2022-02-01)


### Features

* **pintora-diagrams:** [activityDiagram] optimize while layout by inserting dummy edge ([54cea28](https://github.com/hikerpig/pintora/commit/54cea28c3d31b404f30aeecf6917e160847832b6))
* **pintora-diagrams:** [componentDiagram] we can have relationship from element to group ([9cc74cd](https://github.com/hikerpig/pintora/commit/9cc74cdc53013b6b63a13658ff719d414d04706f))





# [0.1.0-alpha.23](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.21...v0.1.0-alpha.23) (2022-01-30)


### Bug Fixes

* **pintora-diagrams:** [activityDiagram] should draw nested groups correctly ([720dfe5](https://github.com/hikerpig/pintora/commit/720dfe5a4203e03ff055faa5a1144170867edbcd))


### Features

* **pintora-core:** configApi.setConfig, replace array instead of merging ([f6f5b24](https://github.com/hikerpig/pintora/commit/f6f5b24ae941d2400f965e349e30d6dfee764bda))
* **pintora-diagrams:** set default font family ([d5bab84](https://github.com/hikerpig/pintora/commit/d5bab84506956a69791508a6ba1fd45a0a297943))





# [0.1.0-alpha.22](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.21...v0.1.0-alpha.22) (2022-01-27)


### Features

* **pintora-core:** configApi.setConfig, replace array instead of merging ([f6f5b24](https://github.com/hikerpig/pintora/commit/f6f5b24ae941d2400f965e349e30d6dfee764bda))
* **pintora-core:** move themeRegistry to @pintora/core ([aa3e4c9](https://github.com/hikerpig/pintora/commit/aa3e4c92446f6c6af4177821f995cd7f86e30da5))
* **pintora-standalone:** assign temp config in `renderTo` method ([85d4c4a](https://github.com/hikerpig/pintora/commit/85d4c4adf72199aa1ef4732fac08cf1d30e31f7c))





# [0.1.0-alpha.21](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.20...v0.1.0-alpha.21) (2022-01-25)

**Note:** Version bump only for package pintora





# [0.1.0-alpha.19](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.18...v0.1.0-alpha.19) (2022-01-22)


### Bug Fixes

* parser error when adding `\n` as suffix ([16fc07e](https://github.com/hikerpig/pintora/commit/16fc07e016c2cd506b7951a64f9b24cf26671447))


### Features

* **pintora-diagrams:** add mindmap support ([3062216](https://github.com/hikerpig/pintora/commit/306221660b34baad83d67435470d6aabc27b289f))





# [0.1.0-alpha.18](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.17...v0.1.0-alpha.18) (2022-01-16)


### Features

* **pintora-cli:** read cli args `--theme` ([a502c35](https://github.com/hikerpig/pintora/commit/a502c35cf1dbbad65c5847e2752e17711b8dccef))
* **pintora-core:** PintoraConfig can now be type augmented ([c6167cb](https://github.com/hikerpig/pintora/commit/c6167cbfa22b5e96610c6601007eca64a8d18450))





# [0.1.0-alpha.17](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.16...v0.1.0-alpha.17) (2022-01-15)


### Bug Fixes

* **pintora-cli:** output filename mimetype bug ([54601f6](https://github.com/hikerpig/pintora/commit/54601f639e351100f040f1e22d9beaedb1658b5e))





# [0.1.0-alpha.16](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.15...v0.1.0-alpha.16) (2022-01-15)


### Features

* **demo:** add sidebar and theme previewer ([633d7e6](https://github.com/hikerpig/pintora/commit/633d7e6b6d77e75104c5207161f914ec97942269))
* **pintora-diagrams:** adjust dark theme, and how theme affects diagrams ([ee2728e](https://github.com/hikerpig/pintora/commit/ee2728ec71ebdaa77c94c6e56b508875bbb6bff5))
* add method `registerTheme` ([8302e56](https://github.com/hikerpig/pintora/commit/8302e5660d226ac9458d6a6cd9a54fecf4f84b9d))





# [0.1.0-alpha.15](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.14...v0.1.0-alpha.15) (2022-01-05)


### Bug Fixes

* upgrade to `@hikerpig/moo` to solve parser state corruption when parse multiple times ([dbe9f97](https://github.com/hikerpig/pintora/commit/dbe9f97ba3a6a96597dd8a9fd2017cd09b17c21b))


### Features

* **pintora-diagrams:** add curvedEdge config and path interpolation for activity and er ([6699808](https://github.com/hikerpig/pintora/commit/66998089a1c64b0cb7769f0cf54472b8bad3b050))





# [0.1.0-alpha.14](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.13...v0.1.0-alpha.14) (2021-12-30)


### Features

* **pintora-demo:** save editor code before unload and restore when new page loads ([fd4a2cc](https://github.com/hikerpig/pintora/commit/fd4a2ccba143140fed1de635641ab479a2de5ab9))
* **pintora-diagrams:** [activityDiagram] Add support for parallel processing (fork) ([3ab6f2e](https://github.com/hikerpig/pintora/commit/3ab6f2e527b23081313d093366a988a37be4a7b9))





# [0.1.0-alpha.13](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.12...v0.1.0-alpha.13) (2021-12-15)


### Features

* **pintora-cli:** Add ability to output svg file in cli ([52f1b91](https://github.com/hikerpig/pintora/commit/52f1b912e803fbace13af8ab5a761f4ee446e141))





# [0.1.0-alpha.12](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.11...v0.1.0-alpha.12) (2021-12-11)


### Features

* **pintora-diagrams:** [activityDiagram] Add style config ([f1c908a](https://github.com/hikerpig/pintora/commit/f1c908a68fd4a9ba12e505cf144b78c913f3a03c))
* **pintora-diagrams:** [activityDiagram] parse and draw arrowLabel ([aae1275](https://github.com/hikerpig/pintora/commit/aae1275ac322b4ac72dfc08c579512210250a150))
* color scheme larkLight / larkDark ([aa16be1](https://github.com/hikerpig/pintora/commit/aa16be1049934cb9d83b1c6c0c8363807cf48418))





# [0.1.0-alpha.11](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.10...v0.1.0-alpha.11) (2021-12-04)


### Bug Fixes

* **pintora-diagrams:** marker direction calculation in sequenceDiagram ([91a783c](https://github.com/hikerpig/pintora/commit/91a783c5085739ddd6bde364aa31f4984ca46753))


### Features

* **pintora-diagrams:** Add basic activityDiagram [#3](https://github.com/hikerpig/pintora/issues/3) ([718a80e](https://github.com/hikerpig/pintora/commit/718a80e55d209d618fb855a463a151b880bf6fc3))





# [0.1.0-alpha.10](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.9...v0.1.0-alpha.10) (2021-09-07)


### Features

* **pintora-diagrams:** `[@style](https://github.com/style)` clause with brackets ([0f79672](https://github.com/hikerpig/pintora/commit/0f7967237af1dd42178edb227417ce89b8de23f5))





# [0.1.0-alpha.9](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.8...v0.1.0-alpha.9) (2021-09-05)


### Features

* custom style engine and `[@style](https://github.com/style)` rule in componentDiagram ([14dc634](https://github.com/hikerpig/pintora/commit/14dc63438999be65fc4518a72b4c6ced64352984))
* **pintora-demo:** CodeMirror options ([e4dccc5](https://github.com/hikerpig/pintora/commit/e4dccc5b9168560e3640bbe964b82117c3491ec2))
* **pintora-diagrams:** [sequenceDiagram] participant with classifier symbol ([0372a29](https://github.com/hikerpig/pintora/commit/0372a2941342a6834e9edb98dada87cd8ee51b6e))





# [0.1.0-alpha.8](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.7...v0.1.0-alpha.8) (2021-08-29)


### Features

* [sequenceDiagram] add custom group color ([f93fe8a](https://github.com/hikerpig/pintora/commit/f93fe8a6fdb81af55eeb6f303f426c6150eeaf86))
* custom style engine and `[@style](https://github.com/style)` rule in erDiagram ([564af61](https://github.com/hikerpig/pintora/commit/564af616b3e5c808155506cbb05f0a8d5e882b85))
* custom style engine and `[@style](https://github.com/style)` rule in sequenceDiagram ([1bf902c](https://github.com/hikerpig/pintora/commit/1bf902cd1bbf79108e68ec8010604e3fb17904ff))





# [0.1.0-alpha.7](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.6...v0.1.0-alpha.7) (2021-08-24)


### Bug Fixes

* [sequenceDiagram] lower lexer priority to make messages more tolerant ([c9dadfd](https://github.com/hikerpig/pintora/commit/c9dadfdc9261f7f11882b976f9e18531cb7a460e))





# [0.1.0-alpha.6](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.5...v0.1.0-alpha.6) (2021-08-21)

**Note:** Version bump only for package pintora





# [0.1.0-alpha.5](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.4...v0.1.0-alpha.5) (2021-08-16)


### Bug Fixes

* **pintora-diagrams:** calcDirection ([ee55d14](https://github.com/hikerpig/pintora/commit/ee55d143fb7876186b1140e4502b1282a7804e6d))





# [0.1.0-alpha.4](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.3...v0.1.0-alpha.4) (2021-08-15)


### Bug Fixes

* **pintora-diagrams:** [componentDiagram] avoid interface node overlapping ([213cea0](https://github.com/hikerpig/pintora/commit/213cea090f40717390417e143366026d841f9808))


### Features

* **pintora-demo:** add '/demo/preview/?code=' page ([d5dce94](https://github.com/hikerpig/pintora/commit/d5dce944b3e2ed6ec081a0ff29e72ed1d00efb98))
* **pintora-demo:** add error hint to editor ([8f82d11](https://github.com/hikerpig/pintora/commit/8f82d1182cc796a9e8dec10081784e8424d30add))
* **pintora-diagrams:** [erDiagram] add support for key coloumn like 'PK' ([64dad3d](https://github.com/hikerpig/pintora/commit/64dad3ddd8cefb912d7c83e14cf8a2dc0e64c5f8))
* support symbols as content wrapper in component diagram ([afdaf69](https://github.com/hikerpig/pintora/commit/afdaf6964d09c9b8f2bb5fd28a173f19120415f6))





# [0.1.0-alpha.3](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.2...v0.1.0-alpha.3) (2021-08-07)


### Features

* setConfig `core.defaultRenderer` ([d6bc00c](https://github.com/hikerpig/pintora/commit/d6bc00c1335f8fde74c5f967fac4d3a36fb429ea))





# [0.1.0-alpha.2](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.1...v0.1.0-alpha.2) (2021-08-07)


### Features

* **pintora-demo:** ConfigEditor in live-editor ([973f07b](https://github.com/hikerpig/pintora/commit/973f07baf282fe0e13df37cf75a0e71d0d70a321))
* **pintora-demo:** sync config to preview ([c8a9392](https://github.com/hikerpig/pintora/commit/c8a939200b69de8826ccb6973db96ce4b94250f5))
* **pintora-diagrams:** adjust diagram colors with dark theme ([72d3720](https://github.com/hikerpig/pintora/commit/72d37207f6e125ba354997b956d53c6d0e3528eb))





# [0.1.0-alpha.1](https://github.com/hikerpig/pintora/compare/v0.1.0-alpha.0...v0.1.0-alpha.1) (2021-08-01)


### Features

* basic theme for current diagrams ([f5d1332](https://github.com/hikerpig/pintora/commit/f5d133274d55bbd0414ed9b706d831e43e56e2b4))





# [0.1.0-alpha.0](https://github.com/hikerpig/pintora/compare/v0.0.1...v0.1.0-alpha.0) (2021-08-01)


### Features

* **pintora-demo:** live-editor new layout and new abilities ([d93a152](https://github.com/hikerpig/pintora/commit/d93a15231dffdad9393aefe96477be83bfb7ff8d))
* **pintora-standalone:** `pintora.setConfig` ([ad59e8b](https://github.com/hikerpig/pintora/commit/ad59e8b60f3c7ae2fdbf01fede70e258991dbc0d))
* Add componentDiagram ([c967f1c](https://github.com/hikerpig/pintora/commit/c967f1c9a969a813adac9a9967a06a024f04d73f))
