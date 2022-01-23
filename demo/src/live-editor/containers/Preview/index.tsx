import React, { useCallback } from 'react'
import classnames from 'classnames'
import { useDispatch, connect } from 'react-redux'
import { StoreState } from 'src/live-editor/redux/store'
import { actions } from 'src/live-editor/redux/slice'
import PintoraPreview from 'src/components/PintoraPreview'
import './Preview.less'

interface Props {
  previewCode: string
  previewConfig: StoreState['main']['preview']['config']
  className?: string
  pintoraConfig?: any
}

interface NearlyError extends Error {
  token: {
    line: number
    col: number
    offset: number
  }
}

const Preview = ({ previewCode, previewConfig, pintoraConfig, className }: Props) => {
  const dispatch = useDispatch()

  const handleRendererChange = useCallback(
    (e: any) => {
      dispatch(actions.updatePreviewConfig({ renderer: e.target.value as any }))
    },
    [previewConfig],
  )

  const handleError = useCallback((error: NearlyError) => {
    if (error.token) {
      const errorInfo = {
        line: error.token.line,
        col: error.token.col,
        offset: error.token.offset,
        message: error.message,
      }
      dispatch(actions.updateEditorError({ errorInfo }))
    }
  }, [])

  const handleSuccess = useCallback(() => {
    dispatch(actions.updateEditorError({ errorInfo: null }))
  }, [])

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
            <select
              className="select select-bordered select-secondary select-sm w-full max-w-xs"
              value={previewConfig.renderer}
              onChange={handleRendererChange}
            >
              <option value="svg">svg</option>
              <option value="canvas">canvas</option>
            </select>
          </div>
          {/* <div className="section">
            <button className="btn btn-primary btn-sm">Download</button>
          </div> */}
        </div>
      </div>
      <PintoraPreview
        code={previewCode}
        renderer={previewConfig.renderer}
        pintoraConfig={pintoraConfig}
        onError={handleError}
        onSuccess={handleSuccess}
      />
    </div>
  )
}

const connector = connect((state: StoreState) => {
  return {
    previewCode: state.main.preview.code,
    previewConfig: state.main.preview.config,
    pintoraConfig: state.main.preview.pintoraConfig,
  }
})(Preview)

export default connector
