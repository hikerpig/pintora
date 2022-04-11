import React, { useCallback } from 'react'
import CodeMirrorEditor from 'src/live-editor/components/CodeMirrorEditor'
import { useDispatch, connect, ConnectedProps } from 'react-redux'
import { StoreState } from 'src/live-editor/redux/store'
import { actions } from 'src/live-editor/redux/slice'
import './Editor.less'

const CODE_EDITOR_OPTIONS = {
  language: 'pintora',
}

function Editor(props: Props) {
  const { editorCode, show, errorInfo } = props
  const dispatch = useDispatch()

  const onCodeChange = useCallback((code: string) => {
    dispatch(actions.updateEditorCode({ code }))
  }, [])

  const style = {
    display: show ? 'flex' : 'none',
  }
  return (
    <div className="Editor" style={style}>
      <CodeMirrorEditor
        code={editorCode}
        onCodeChange={onCodeChange}
        editorOptions={CODE_EDITOR_OPTIONS}
        errorInfo={errorInfo}
      ></CodeMirrorEditor>
    </div>
  )
}

const connector = connect((state: StoreState) => {
  return {
    editorCode: state.main.editor.code,
    errorInfo: state.main.editor.error,
    show: state.main.currentEditor === 'code',
  }
})

type Props = ConnectedProps<typeof connector>

export default connector(Editor)
