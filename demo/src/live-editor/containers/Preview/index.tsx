import React, { useCallback, useEffect } from 'react'
import classnames from 'classnames'
import { useDispatch, connect } from 'react-redux'
import { State, actions } from 'src/live-editor/redux/slice'
import PintoraPreview from 'src/components/PintoraPreview'
import './Preview.less'

interface Props {
  previewCode: string
  previewConfig: State['preview']['config']
  className?: string
  pintoraConfig?: any
}

const Preview = ({ previewCode, previewConfig, pintoraConfig, className }: Props) => {
  const dispatch = useDispatch()

  const onRendererChange = useCallback(
    (e: any) => {
      dispatch(actions.updatePreviewConfig({ renderer: e.target.value as any }))
    },
    [previewConfig],
  )

  const cls = classnames({
    Preview: true,
    'flex-grow': true,
    flex: true,
    'flex-col': true,
    [className || '']: Boolean(className),
  })

  return (
    <div className={cls}>
      <div className="Preview__toolbar">
        <div className="px-2 py-1">
          <div className="section">
            <label>Renderer:</label>
            <select className="select select-bordered select-secondary select-sm w-full max-w-xs" value={previewConfig.renderer} onChange={onRendererChange}>
              <option value="svg">svg</option>
              <option value="canvas">canvas</option>
            </select>
          </div>
          {/* <div className="section">
            <button className="btn btn-primary btn-sm">Download</button>
          </div> */}
        </div>
      </div>
      <PintoraPreview code={previewCode} renderer={previewConfig.renderer} pintoraConfig={pintoraConfig} />
    </div>
  )
}

const connector = connect((state: State) => {
  return {
    previewCode: state.preview.code,
    previewConfig: state.preview.config,
    pintoraConfig: state.preview.pintoraConfig,
  }
})(Preview)

export default connector
