import React, { useCallback } from 'react'
import MonacoEditor from 'src/live-editor/components/MonacoEditor'
import { useDispatch, connect } from 'react-redux'
import { State, actions } from 'src/live-editor/redux/slice'
import './Editor.less'

interface Props {
  editorCode: string
  show: boolean
}

const CODE_EDITOR_OPTIONS = {
  language: 'pintora',
}

function Editor(props: Props) {
  const { editorCode, show } = props
  const dispatch = useDispatch()

  const onCodeChange = useCallback((code) => {
    dispatch(actions.updateEditorCode({ code }))
  }, [])
 
  const style = {
    display: show ? 'flex': 'none',
  }
  return <div className="Editor" style={style}>
    <MonacoEditor code={editorCode} onCodeChange={onCodeChange} editorOptions={CODE_EDITOR_OPTIONS}></MonacoEditor>
  </div>
}

export default connect((state: State) => {
  return {
    editorCode: state.editor.code,
    show: state.currentEditor === 'code',
  } as Props
})(Editor)
