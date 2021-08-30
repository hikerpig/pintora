import React, { useEffect, useRef } from 'react'
import { ErrorInfo } from 'src/live-editor/type'
// import {EditorView, EditorState} from '@codemirror/basic-setup'
import { keymap, EditorView } from '@codemirror/view'
import { history, historyKeymap } from '@codemirror/history'
import { EditorState } from '@codemirror/state'
import { standardKeymap } from '@codemirror/commands'
import './CMEditor.less'

interface Props {
  code: string
  onCodeChange(code: string): void
  editorOptions: any
  errorInfo?: ErrorInfo | null
}

let baseTheme = EditorView.baseTheme({
  ".cm-o-replacement": {
    display: "inline-block",
    width: ".5em",
    height: ".5em",
    borderRadius: ".25em"
  },
  '.cm-line': {
    fontSize: 16,
    fontFamily: 'Menlo, Consolas, sans-serif'
  },
  "&light .cm-o-replacement": {
    backgroundColor: "#04c"
  },
  "&dark .cm-o-replacement": {
    backgroundColor: "#5bf"
  }
})

const Editor = (props: Props) => {
  const { code, onCodeChange, editorOptions, errorInfo } = props
  const wrapperRef = useRef<HTMLDivElement>()
  const viewRef = useRef<EditorView>()
  const stateRef = useRef<EditorState>()

  useEffect(() => {
    if (!wrapperRef.current) return

    let editor = viewRef.current
    let state = stateRef.current
    if (viewRef.current) viewRef.current.destroy()
    if (!state) {
      state = EditorState.create({
        doc: code,
        extensions: [keymap.of(standardKeymap), baseTheme, history(), keymap.of(historyKeymap)],
      })
    }

    editor = new EditorView({
      parent: wrapperRef.current,
      state: state,
    })

    // editor = monaco.editor.create(wrapperRef.current, {
    //   value: code,
    //   minimap: { enabled: false },
    //   lineDecorationsWidth: 0,
    //   automaticLayout: true,
    //   fontSize: 15,
    //   theme: 'vs-dark',
    //   tabSize: 2,
    //   ...editorOptions,
    // })

    // const editorModel = editor.getModel()
    // if (editorModel) {
    //   editorModel.onDidChangeContent((e) => {
    //     const newCode = editorModel.getLinesContent().join('\n')
    //     // console.log('on change')
    //     if (!e.changes.length) return
    //     onCodeChange(newCode)
    //   })
    // }
    viewRef.current = editor

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy()
      }
    }
  }, [])

  useEffect(() => {
    const state = stateRef.current
    const view = viewRef.current
    if (state && view) {
      const currentCode = state.doc.toJSON().join('\n')
      // console.log('currentCode == code', currentCode == code)
      if (currentCode !== code) {
        view.dispatch(state.update({ changes: { from: 0, to: currentCode.length, insert: code } }))
      }
    }
  }, [code])

  useEffect(() => {
    // const editor = viewRef.current
    // if (!editor) return
    // const model = editor.getModel()
    // if (model) {
    //   if (errorInfo) {
    //     monaco.editor.setModelMarkers(model, 'pintora', [{
    //       startLineNumber: errorInfo.line,
    //       startColumn: errorInfo.col,
    //       endLineNumber: errorInfo.line,
    //       endColumn: errorInfo.col,
    //       message: errorInfo.message,
    //       severity: monaco.MarkerSeverity.Error,
    //     }])
    //   } else {
    //     monaco.editor.setModelMarkers(model, 'pintora', [])
    //   }
    // }
  }, [errorInfo])

  return <div className="CMEditor" ref={wrapperRef as any}></div>
}

export default Editor
