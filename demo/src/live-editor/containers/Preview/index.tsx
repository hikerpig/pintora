import React, { useCallback } from 'react'
import { useDispatch, connect } from 'react-redux'
import { init } from '@pintora/diagrams'
import slice, { State, actions } from 'src/live-editor/redux/slice'
import PintoraPreview from 'src/components/PintoraPreview'
import './Preview.less'

init()

interface Props {
  previewCode: string
  previewConfig: State['preview']['config']
}

const Preview = ({ previewCode, previewConfig }: Props) => {
  const dispatch = useDispatch()

  const onRendererChange = useCallback((e: any) => {
    dispatch(actions.updatePreviewConfig({ renderer: e.target.value as any }))
  }, [previewConfig])

  return (
    <div className="Preview flex-grow flex flex-col">
      <PintoraPreview code={previewCode} renderer={previewConfig.renderer} />
      <div className="Preview__bottom">
        <div className="px-2 py-1">
          <div className="section">
            <label>Renderer:</label>
            <select value={previewConfig.renderer} onChange={onRendererChange}>
              <option value="svg">svg</option>
              <option value="canvas">canvas</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

export default connect((state: State) => {
  return {
    previewCode: state.preview.code,
    previewConfig: state.preview.config,
  } as Props
})(Preview)
