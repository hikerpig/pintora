import React, { useEffect, useRef } from 'react'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import { ErrorInfo } from 'src/live-editor/type'

;(self as any).MonacoEnvironment = {
  getWorker(_: string, label: string) {
    if (label === 'json') {
      return new JsonWorker();
    }
    return new editorWorker()
  },
}

interface Props {
  code: string
  onCodeChange(code: string): void
  editorOptions: Partial<monaco.editor.IStandaloneEditorConstructionOptions>
  errorInfo?: ErrorInfo | null
}

const MonacoEditor = (props: Props) => {
  const { code, onCodeChange, editorOptions, errorInfo } = props
  const wrapperRef = useRef<HTMLDivElement>()
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>()

  useEffect(() => {
    if (!wrapperRef.current) return

    let editor = editorRef.current
    if (editorRef.current) editorRef.current.dispose()

    editor = monaco.editor.create(wrapperRef.current, {
      value: code,
      minimap: { enabled: false },
      lineDecorationsWidth: 0,
      automaticLayout: true,
      fontSize: 15,
      theme: 'vs-dark',
      tabSize: 2,
      ...editorOptions,
    })
    const editorModel = editor.getModel()
    if (editorModel) {
      editorModel.onDidChangeContent((e) => {
        const newCode = editorModel.getLinesContent().join('\n')
        // console.log('on change')
        if (!e.changes.length) return
        onCodeChange(newCode)
      })
    }
    editorRef.current = editor

    return () => {
      if (editorRef.current) {
        editorRef.current.dispose()
      }
    }
  }, [])

  useEffect(() => {
    const editor = editorRef.current
    if (editor) {
      const currentCode = editor.getValue()
      // console.log('currentCode == code', currentCode == code)
      if (currentCode !== code) editor.setValue(code)
    }
  }, [code])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    const model = editor.getModel()
    if (model) {
      if (errorInfo) {
        monaco.editor.setModelMarkers(model, 'pintora', [{
          startLineNumber: errorInfo.line,
          startColumn: errorInfo.col,
          endLineNumber: errorInfo.line,
          endColumn: errorInfo.col,
          message: errorInfo.message,
          severity: monaco.MarkerSeverity.Error,
        }])
      } else {
        monaco.editor.setModelMarkers(model, 'pintora', [])
      }
    }
  }, [errorInfo])

  return <div className="MonacoEditor" ref={wrapperRef as any}></div>
}

export default MonacoEditor
