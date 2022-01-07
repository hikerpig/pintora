import React, { useCallback } from 'react'
import { EXAMPLES } from '@pintora/test-shared'
import { actions } from 'src/live-editor/redux/slice'
import Buttons from 'src/live-editor/components/Buttons'
import store from '../../redux/store'
import './Examples.less'

interface ExamplesProps {}

const Examples = ({}: ExamplesProps) => {
  const onExampleClick = useCallback((e: any) => {
    const key = e.currentTarget.dataset.key
    const example = (EXAMPLES as any)[key]
    if (example) {
      store.dispatch(actions.updateEditorCode({ code: example.code, syncToPreview: true }))
    }
  }, [])
  return (
    <div className="Examples">
      <Buttons>
        {Object.entries(EXAMPLES).map(([key, example]) => {
          return (
            <div
              key={key}
              className="btn btn-primary btn-sm"
              data-key={key}
              title={example.description}
              onClick={onExampleClick}
            >
              {example.name}
            </div>
          )
        })}
      </Buttons>
    </div>
  )
}

export default Examples
