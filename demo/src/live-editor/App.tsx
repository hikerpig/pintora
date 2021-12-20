import React, { useCallback, useEffect } from 'react'
import { Provider } from 'react-redux'
import pintora from '@pintora/standalone'
import { EXAMPLES } from '@pintora/test-shared'
import Header from './components/Header'
import Preview from './containers/Preview'
import Panel from './components/Panel'
import Examples from './containers/Examples'
import Actions from './containers/Actions'
import EditorPanel from './containers/EditorPanel'
import store from './redux/store'
import { actions } from 'src/live-editor/redux/slice'
import { DEMO_BASE_URL } from '../const'
import './App.css'

const LAST_EDITOR_CODE_KEY = 'pintoraEditorCode'

function App() {
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    let code = ''
    const encodedCode = params.get('code')
    if (encodedCode) {
      try {
        code = pintora.util.decodeCodeInUrl(encodedCode)
      } catch (error) {
        console.error('[live-editor] error when decoding code in url', error)
      }
      const newParams = new URLSearchParams(params)
      newParams.delete('code')
      history.replaceState(null, '', `?${newParams.toString()}`)
    } else if (params.has('example')) {
      const exampleName: keyof typeof EXAMPLES = params.get('example') as any
      if (exampleName) {
        const example = EXAMPLES[exampleName]
        if (example) {
          code = EXAMPLES[exampleName].code
        }
      }
    } else {
      try {
        const rawData = localStorage.getItem(LAST_EDITOR_CODE_KEY)
        if (rawData) {
          const data = JSON.parse(rawData)
          code = data.code
        }
      } catch (error) {
        console.warn('error recovering data from storage', error)
      }
    }

    if (code) {
      store.dispatch(actions.updateEditorCode({ code, syncToPreview: true }))
    }
  }, [])

  useEffect(() => {
    const handler = () => {
      const state = store.getState()
      const dataToSave = {
        code: state.editor.code,
      }
      localStorage.setItem(LAST_EDITOR_CODE_KEY, JSON.stringify(dataToSave))
    }

    window.addEventListener('beforeunload', handler)

    return () => {
      window.removeEventListener('beforeunload', handler)
    }
  }, [])

  const onOpenPreviewPage = useCallback(() => {
    try {
      const state = store.getState()
      const previewCode = state.preview.code
      const encodedCode = pintora.util.encodeForUrl(previewCode)
      const encodedPintoraConfig = pintora.util.encodeForUrl(JSON.stringify(state.preview.pintoraConfig))
      window.open(`${DEMO_BASE_URL}preview/?code=${encodedCode}&config=${encodedPintoraConfig}`)
    } catch (error) {}
  }, [])
  const previewHeaderSuffix = (
    <div>
      <button className="btn btn-primary btn-xs" onClick={onOpenPreviewPage}>
        Open preview page
      </button>
    </div>
  )

  return (
    <Provider store={store}>
      <div className="App min-h-screen min-w-screen flex flex-col" data-theme="bumblebee">
        <Header></Header>
        <div className="App__content flex">
          <div className="App__left">
            <EditorPanel />
            <Panel title="Examples">
              <Examples />
            </Panel>
            <Panel title="Actions">
              <Actions />
            </Panel>
          </div>
          <div className="App__right">
            <Panel title="Preview" headerAppendix={previewHeaderSuffix}>
              <Preview className="App__preview" />
            </Panel>
          </div>
        </div>
      </div>
    </Provider>
  )
}

export default App
