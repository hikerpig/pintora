import * as React from 'react'
import { useDispatch, useStore, Provider } from 'react-redux'
import Header from './components/Header'
import Editor from './components/Editor'
import Preview from './containers/Preview'
import store from './redux/store'
import './App.css'

function App() {
  return (
    <Provider store={store}>
      <div className="App min-h-screen min-w-screen flex flex-col">
        <Header></Header>
        <div className="container App__content flex">
          <Editor />
          <Preview />
        </div>
      </div>
    </Provider>
  )
}

export default App
