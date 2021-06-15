import React, { useState, useEffect, useRef } from 'react'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

;(self as any).MonacoEnvironment = {
  getWorker(_: string, label: string) {
    if (label === 'json') {
      return new jsonWorker()
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker()
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker()
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker()
    }
    return new editorWorker()
  },
}

interface Props {
  code: string
  onCodeChange(code: string): void
}

const MonacoEditor = (props: Props) => {
  const { code, onCodeChange, } = props
  const wrapperRef = useRef<HTMLDivElement>()
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>()

  useEffect(() => {
    if (!wrapperRef.current) return

    let editor = editorRef.current
    if (editorRef.current) editorRef.current.dispose()

    editor = monaco.editor.create(wrapperRef.current, {
      value: code,
      language: 'pintora',
      minimap: { enabled: false },
      lineNumbers: 'off',
      lineDecorationsWidth: 0,
      automaticLayout: true,
      fontSize: 15,
      theme: 'vs-dark',
    })
    const editorModel = editor.getModel()
    if (editorModel) {
      editorModel.onDidChangeContent((e) => {
        const newCode = editorModel.getLinesContent().join('\n')
        if (newCode === code) return
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
      if (currentCode !== code) editor.setValue(code)
    }
  }, [code])

  return <div className="MonacoEditor" ref={wrapperRef as any}></div>
}

export default MonacoEditor
