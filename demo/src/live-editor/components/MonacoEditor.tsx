import React, { useEffect, useRef } from 'react'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'

;(self as any).MonacoEnvironment = {
  getWorker(_: string, label: string) {
    return new editorWorker()
  },
}

interface Props {
  code: string
  onCodeChange(code: string): void
  editorOptions: Partial<monaco.editor.IStandaloneEditorConstructionOptions>
}

const MonacoEditor = (props: Props) => {
  const { code, onCodeChange, editorOptions, } = props
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

  return <div className="MonacoEditor" ref={wrapperRef as any}></div>
}

export default MonacoEditor
