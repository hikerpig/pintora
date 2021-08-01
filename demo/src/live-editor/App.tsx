import React, { useEffect } from 'react'
import { Provider } from 'react-redux'
import pintora from '@pintora/standalone'
import { EXAMPLES } from '@pintora/test-shared'
import Header from './components/Header'
import Editor from './components/Editor'
import Preview from './containers/Preview'
import Panel from './components/Panel'
import Examples from './containers/Examples'
import Actions from './containers/Actions'
import store from './redux/store'
import { actions } from 'src/live-editor/redux/slice'
import './App.css'

const EDITOR_TABS = [
  { key: 'code', label: 'Code' },
  { key: 'config', label: 'Config' },
]

function App() {
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    let code: string = ''
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
    }
    if (code) {
      store.dispatch(actions.updateEditorCode({ code, syncToPreview: true }))
    }
  }, [])

  return (
    <Provider store={store}>
      <div className="App min-h-screen min-w-screen flex flex-col" data-theme="bumblebee">
        <Header></Header>
        <div className="App__content flex">
          <div className="App__left">
            <Panel title="Editor">
              <Editor />
            </Panel>
            <Panel title="Examples">
              <Examples />
            </Panel>
            <Panel title="Actions">
              <Actions />
            </Panel>
          </div>
          <div className="App__right">
            <Panel title="Preview">
              <Preview className="App__preview" />
            </Panel>
          </div>
        </div>
      </div>
    </Provider>
  )
}

export default App
