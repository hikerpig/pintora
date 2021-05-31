import React, { useCallback } from 'react'
import MonacoEditor from './MonacoEditor'
import { useDispatch, connect } from 'react-redux'
import slice, { State, actions } from 'src/live-editor/redux/slice'
import './Editor.less'

interface Props {
  editorCode: string
}

function Editor(props: Props) {
  const { editorCode } = props
  const dispatch = useDispatch()

  const onCodeChange = useCallback((code) => {
    dispatch(actions.updateEditorCode({ code, syncToPreview: true }))
  }, [])
 
  return <div className="Editor">
    <MonacoEditor code={editorCode} onCodeChange={onCodeChange}></MonacoEditor>
  </div>
}

export default connect((state: State) => {
  return {
    editorCode: state.editor.code,
  } as Props
})(Editor)