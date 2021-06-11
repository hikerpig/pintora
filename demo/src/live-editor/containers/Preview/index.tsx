import React, { useCallback } from 'react'
import classnames from 'classnames'
import { useDispatch, connect } from 'react-redux'
import slice, { State, actions } from 'src/live-editor/redux/slice'
import PintoraPreview from 'src/components/PintoraPreview'
import './Preview.less'

interface Props {
  previewCode: string
  previewConfig: State['preview']['config']
  className?: string
}

const Preview = ({ previewCode, previewConfig, className }: Props) => {
  const dispatch = useDispatch()

  const onRendererChange = useCallback((e: any) => {
    dispatch(actions.updatePreviewConfig({ renderer: e.target.value as any }))
  }, [previewConfig])

  const cls = classnames({
    'Preview': true,
    'flex-grow': true,
    'flex': true,
    'flex-col': true,
    [className || '']: Boolean(className),
  })

  return (
    <div className={cls}>
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

const connector = connect((state: State) => {
  return {
    previewCode: state.preview.code,
    previewConfig: state.preview.config,
  }
})(Preview)

export default connector