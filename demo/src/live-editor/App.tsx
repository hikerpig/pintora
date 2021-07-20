import React, { useEffect } from 'react'
import { Provider } from 'react-redux'
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
      code = decodeURIComponent(atob(encodedCode))
      const newParams = new URLSearchParams(params)
      newParams.delete('code')
      history.replaceState(null, '', `?${newParams.toString()}`)
    } else if (params.has('example')) {
      const exampleName = params.get('example')
      if (exampleName) {
        const example = (EXAMPLES as any)[exampleName]
        if (example) {
          code = (EXAMPLES as any)[exampleName]
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
