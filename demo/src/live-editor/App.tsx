import React, { useEffect } from 'react'
import { Provider } from 'react-redux'
import pintora from '@pintora/standalone'
import { EXAMPLES } from '@pintora/test-shared'
import Header from './components/Header'
import Editor from './components/Editor'
import Preview from './containers/Preview'
import store from './redux/store'
import { actions } from 'src/live-editor/redux/slice'
import './App.css'

function App() {
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    let code: string = ''
    const encodedCode = params.get('code')
    if (encodedCode) {
      try {
        // code = unescape(atob(decodeURIComponent(encodedCode)))
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
      <div className="App min-h-screen min-w-screen flex flex-col">
        <Header></Header>
        <div className="App__content flex">
          <Editor />
          <Preview className="App__preview" />
        </div>
      </div>
    </Provider>
  )
}

export default App
