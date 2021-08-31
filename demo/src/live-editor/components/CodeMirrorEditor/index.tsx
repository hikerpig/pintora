import React, { useEffect, useRef } from 'react'
import { ErrorInfo } from 'src/live-editor/type'
// import {EditorView, EditorState} from '@codemirror/basic-setup'
import { keymap, EditorView } from '@codemirror/view'
import { history, historyKeymap } from '@codemirror/history'
import { EditorState } from '@codemirror/state'
import { standardKeymap } from '@codemirror/commands'
import { oneDarkTheme } from '@codemirror/theme-one-dark'
import './CMEditor.less'

interface Props {
  code: string
  onCodeChange(code: string): void
  editorOptions: any
  errorInfo?: ErrorInfo | null
}

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
      const onUpdateExtension = EditorView.updateListener.of(update => {
        if (update.docChanged && state) {
          const newCode = update.view.state.doc.toJSON().join('\n')
          onCodeChange(newCode)
        }
      })
      state = EditorState.create({
        doc: code,
        extensions: [keymap.of(standardKeymap), history(), oneDarkTheme, keymap.of(historyKeymap), onUpdateExtension],
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

  // TOOD: highlight error
  // useEffect(() => {
  // }, [errorInfo])

  return <div className="CMEditor" ref={wrapperRef as any}></div>
}

export default Editor
