// @ts-check
// this module runs inside edge runtime, and pintoraTarget will be prepended by bundler
/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../../types/index.d.ts" />

const target = pintoraTarget

export const config = {
  runtime: 'edge',
}

/**
 *
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export default async function handler(request) {
  const requestText = await request.text()

  try {
    const code =
      requestText ||
      `
    sequenceDiagram
    title: Sequence Diagram Example
    autonumber
    User->>Pintora: render this
    `
    const result = await target.render({
      code,
    })
    const response = new Response(result.data, {
      headers: {
        'Content-Type': 'image/svg+xml',
      },
    })
    return response
  } catch (error) {
    console.log('got error', error)
    return new Response('error', {})
  }
}
