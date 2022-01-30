import React, { useCallback } from 'react'
import { useDebounceCallback } from '@react-hook/debounce'
import CodeMirrorEditor from 'src/live-editor/components/CodeMirrorEditor'
import { useDispatch, connect } from 'react-redux'
import { StoreState } from 'src/live-editor/redux/store'
import { actions } from 'src/live-editor/redux/slice'

interface Props {
  editorCode: string
  show: boolean
}

const CONFIG_EDITOR_OPTIONS = {
  language: 'json',
}

function ConfigEditor(props: Props) {
  const { editorCode, show } = props
  const dispatch = useDispatch()

  const onCodeChange = useDebounceCallback(
    useCallback(code => {
      dispatch(actions.updateConfigCode({ code }))
    }, []),
    500,
  )

  const style = {
    display: show ? 'flex' : 'none',
  }
  return (
    <div className="ConfigEditor Editor" style={style}>
      <CodeMirrorEditor code={editorCode} onCodeChange={onCodeChange} editorOptions={CONFIG_EDITOR_OPTIONS} />
    </div>
  )
}

export default connect((state: StoreState) => {
  return {
    editorCode: state.main.configEditor.code,
    show: state.main.currentEditor === 'config',
  } as Props
})(ConfigEditor)
