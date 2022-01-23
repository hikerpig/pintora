import React, { useEffect, useRef } from 'react'
import { ErrorInfo } from 'src/live-editor/type'
import { keymap, EditorView, highlightActiveLine, Decoration } from '@codemirror/view'
import { history, historyKeymap } from '@codemirror/history'
import { EditorState, Extension } from '@codemirror/state'
import { standardKeymap } from '@codemirror/commands'
import { setDiagnostics } from '@codemirror/lint'
import { oneDarkTheme, oneDarkHighlightStyle } from '@codemirror/theme-one-dark'
import { lineNumbers } from '@codemirror/gutter'
import { searchConfig, searchKeymap } from '@codemirror/search'
import { json } from '@codemirror/lang-json'
import { tabKeymaps } from './utils'
import './CMEditor.less'

type EditorOptions = {
  language: string
}

interface Props {
  code: string
  onCodeChange(code: string): void
  editorOptions: EditorOptions
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
      const extensions: Extension[] = [
        keymap.of(standardKeymap),
        history(),
        oneDarkTheme,
        keymap.of(historyKeymap),
        onUpdateExtension,
        keymap.of(searchKeymap),
        lineNumbers(),
        searchConfig({ top: true }),
        highlightActiveLine(),
        oneDarkHighlightStyle.fallback,
        keymap.of(tabKeymaps),
      ]
      if (editorOptions.language === 'json') {
        extensions.push(json())
      }

      state = EditorState.create({
        doc: code,
        extensions,
      })
      stateRef.current = state
    }

    editor = new EditorView({
      parent: wrapperRef.current,
      state: state,
    })
    viewRef.current = editor

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy()
      }
    }
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (view && view.state) {
      const state = view.state
      const currentCode = state.doc.toJSON().join('\n')
      // console.log('currentCode == code', currentCode == code)
      if (currentCode !== code) {
        view.dispatch(state.update({ changes: { from: 0, to: currentCode.length, insert: code } }))
      }
    }
  }, [code])

  useEffect(() => {
    const view = viewRef.current
    if (view) {
      if (errorInfo) {
        const spec = setDiagnostics(view.state, [
          {
            severity: 'error',
            message: errorInfo.message,
            from: errorInfo.offset,
            to: errorInfo.offset,
          },
        ])
        view.dispatch(spec)
      } else {
        view.dispatch(setDiagnostics(view.state, []))
      }
    }
  }, [errorInfo])

  // TOOD: highlight error
  // useEffect(() => {
  // }, [errorInfo])

  return <div className="CMEditor" ref={wrapperRef as any}></div>
}

export default Editor
