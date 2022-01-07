import React, { useCallback } from 'react'
import { connect, ConnectedProps } from 'react-redux'
import { StoreState } from 'src/live-editor/redux/store'
import pintora from '@pintora/standalone'
import Preview from 'src/live-editor/containers/Preview'
import Panel from 'src/live-editor/components/Panel'
import Examples from 'src/live-editor/containers/Examples'
import Actions from 'src/live-editor/containers/Actions'
import EditorPanel from 'src/live-editor/containers/EditorPanel'
import store from 'src/live-editor/redux/store'
import { DEMO_BASE_URL } from 'src/const'
// import './App.css'

function EditorSpace(props: Props) {
  const onOpenPreviewPage = useCallback(() => {
    try {
      const state = store.getState()
      const previewCode = state.main.preview.code
      const encodedCode = pintora.util.encodeForUrl(previewCode)
      const encodedPintoraConfig = pintora.util.encodeForUrl(JSON.stringify(state.main.preview.pintoraConfig))
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
    <div className="EditorSpace flex flex-grow">
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
  )
}

const connector = connect((state: StoreState) => {
  return {
  }
})

type Props = ConnectedProps<typeof connector>

export default connector(EditorSpace)
