import React, { useCallback } from 'react'
import { connect, ConnectedProps, useDispatch } from 'react-redux'
import { StoreState } from 'src/live-editor/redux/store'
import pintora from '@pintora/standalone'
import Preview from 'src/live-editor/containers/Preview'
import Panel from 'src/live-editor/components/Panel'
import Examples from 'src/live-editor/containers/Examples'
import Actions from 'src/live-editor/containers/Actions'
import EditorPanel from 'src/live-editor/containers/EditorPanel'
import store from 'src/live-editor/redux/store'
import { DEMO_BASE_URL, MIME_TYPES } from 'src/const'
import { actions } from 'src/live-editor/redux/slice'
// import './App.css'

function EditorSpace(props: Props) {
  const dispatch = useDispatch()

  const onOpenPreviewPage = useCallback(() => {
    try {
      const state = store.getState()
      const previewCode = state.main.preview.code
      const encodedCode = pintora.util.encodeForUrl(previewCode)
      const encodedPintoraConfig = pintora.util.encodeForUrl(JSON.stringify(state.main.preview.pintoraConfig))
      window.open(`${DEMO_BASE_URL}preview/?code=${encodedCode}&config=${encodedPintoraConfig}`)
    } catch (error) {}
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      try {
        e.preventDefault()
        e.stopPropagation()
        const file = e.dataTransfer.files.item(0)
        if (file) {
          const { name, type } = file
          const extname = name.split('.').pop()
          if (extname === 'pintora' || type === MIME_TYPES.pintora) {
            const code = await file.text()
            dispatch(actions.updateEditorCode({ code }))
          }
        }
      } catch (error) {
        console.warn('error', error)
      }
    },
    [dispatch],
  )

  const previewHeaderSuffix = (
    <div>
      <button className="btn btn-primary btn-xs" onClick={onOpenPreviewPage}>
        Open Preview Page
      </button>
    </div>
  )

  return (
    <div className="EditorSpace flex flex-grow" onDrop={handleDrop}>
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
  return {}
})

type Props = ConnectedProps<typeof connector>

export default connector(EditorSpace)
