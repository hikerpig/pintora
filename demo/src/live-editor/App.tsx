import React, { useEffect } from 'react'
import { Provider } from 'react-redux'
import pintora from '@pintora/standalone'
import { EXAMPLES } from '@pintora/test-shared'
import Header from './components/Header'
import AppSidebar from './containers/AppSidebar'
import store from './redux/store'
import EditorSpace from 'src/live-editor/containers/EditorSpace'
import ThemePreviewSpace from 'src/live-editor/containers/ThemePreviewSpace'
import { actions } from 'src/live-editor/redux/slice'
import { BrowserRouter, HashRouter, Routes, Route, Outlet } from 'react-router-dom'
import './App.css'

const LAST_EDITOR_CODE_KEY = 'pintoraEditorCode'

function App() {
  useEffect(() => {
    const handler = () => {
      const state = store.getState()
      const dataToSave = {
        code: state.main.editor.code,
      }
      localStorage.setItem(LAST_EDITOR_CODE_KEY, JSON.stringify(dataToSave))
    }

    window.addEventListener('beforeunload', handler)

    return () => {
      window.removeEventListener('beforeunload', handler)
    }
  }, [])

  return (
    <Provider store={store}>
      <div className="App min-h-screen min-w-screen flex flex-col" data-theme="bumblebee">
        <HashRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<EditorSpace />}></Route>
              <Route path="editor" element={<EditorSpace />}></Route>
              <Route path="theme-preview" element={<ThemePreviewSpace />}></Route>
            </Route>
          </Routes>
        </HashRouter>
      </div>
    </Provider>
  )
}

const AppLayout = () => {
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

  return (
    <>
      <Header></Header>
      <div className="App__content flex">
        <AppSidebar></AppSidebar>

        <Outlet />

      </div>
    </>
  )
}

export default App
