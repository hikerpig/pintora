---
'@pintora/cli': minor
---

BREAKING CHANGE: Drop support for Node.js 18. Minimum supported Node.js versions are `^20.19.0 || ^22.13.0 || >=24.0.0` (required by `jsdom` v29 and `canvas` v3.2.3). Also export `renderToSvg` and `renderToImage` programmatic APIs.
