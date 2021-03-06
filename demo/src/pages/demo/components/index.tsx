import React from 'react'
import { setLogLevel } from '@pintora/core'
import { EXAMPLES } from '@pintora/test-shared'
import PintoraPreview from 'src/components/PintoraPreview'
import './index.css'

setLogLevel('debug')

const testSequenceDiagram = EXAMPLES.sequence.code

export default function Basic() {
  return <PintoraPreview code={testSequenceDiagram} />
}
