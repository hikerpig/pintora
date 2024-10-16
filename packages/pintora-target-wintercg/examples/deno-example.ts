// try this example with `deno run --allow-write examples/deno-example.ts`

// import { render } from '../dist/runtime.esm.js'
import { render } from 'jsr:@pintora/target-wintercg'
import { writeFileSync } from 'node:fs'

async function main() {
  const result = await render({
    code: `
mindmap
title: Mind Map levels
* UML Diagrams
** Behavior Diagrams
*** Sequence Diagram
*** State Diagram
  `,
  })

  console.log('result is', result)
  writeFileSync('./result.svg', result.data)
}
main()
