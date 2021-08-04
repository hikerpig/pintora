import React, { useCallback } from 'react'
import MonacoEditor from 'src/live-editor/components/MonacoEditor'
import { useDispatch, connect } from 'react-redux'
import { State, actions } from 'src/live-editor/redux/slice'
// import './Editor.less'

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

  const onCodeChange = useCallback((code) => {
    dispatch(actions.updateConfigCode({ code }))
  }, [])
 
  const style = {
    display: show ? 'flex': 'none',
  }
  return <div className="ConfigEditor Editor" style={style}>
    <MonacoEditor code={editorCode} onCodeChange={onCodeChange} editorOptions={CONFIG_EDITOR_OPTIONS}></MonacoEditor>
  </div>
}

export default connect((state: State) => {
  return {
    editorCode: state.configEditor.code,
    show: state.currentEditor === 'config',
  } as Props
})(ConfigEditor)
