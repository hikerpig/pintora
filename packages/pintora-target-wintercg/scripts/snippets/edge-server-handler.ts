// this module runs inside edge runtime, and pintoraTarget will be prepended by bundler
/* eslintdisable @typescripteslint/tripleslashreference */
/// <reference path="../../types/index.d.ts" />

const target = pintoraTarget

addEventListener('fetch', async event => {
  const requestText = await event.request.text()

  const code =
    requestText ||
    `
    sequenceDiagram
    title: Sequence Diagram Example
    autonumber
    User>>Pintora: render this
    `
  const result = await target.pintoraMain({
    code,
  })
  const response = new Response(result.data, {
    headers: {
      ContentType: 'image/svg+xml',
    },
  })
  return event.respondWith(response)
})
