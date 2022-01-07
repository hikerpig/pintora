import React, { useCallback } from 'react'
import { connect, useDispatch } from 'react-redux'
import Editor from 'src/live-editor/containers/Editor'
import ConfigEditor from 'src/live-editor/containers/ConfigEditor'
import Panel from 'src/live-editor/components/Panel'
import { StoreState } from 'src/live-editor/redux/store'
import { actions } from 'src/live-editor/redux/slice'

const EDITOR_TABS = [
  { key: 'code', label: 'Code' },
  { key: 'config', label: 'Config' },
]

interface EditorPanelProps {
  autoSync: boolean
  currentEditor: string;
}

const EditorPanel = ({ autoSync, currentEditor }: EditorPanelProps) => {
  const dispatch = useDispatch()

  const onEditorTabChange = useCallback((tab: string) => {
    dispatch(actions.setCurrentEditor({ editor: tab }))
  }, [])

  const onRefreshClick = useCallback(() => {
    dispatch(actions.refreshPreview())
  }, [])

  const onAutoSyncChange = useCallback(e => {
    const autoSync = e.target.checked
    dispatch(actions.updateAutoSync(autoSync))
  }, [])

  const editorHeaderAppendix = (
    <div className="flex items-center">
      {!autoSync && (
        <button className="btn btn-primary btn-xs mr-2" onClick={onRefreshClick}>
          Refresh
        </button>
      )}
      <div className="form-control">
        <label className="cursor-pointer flex items-center">
          <span className="label-text mr-2">Auto Sync</span>
          <input
            type="checkbox"
            checked={autoSync}
            className="checkbox checkbox-sm checkbox-accent"
            onChange={onAutoSyncChange}
          />
        </label>
      </div>
    </div>
  )

  return (
    <Panel
      title="Editor"
      tabs={EDITOR_TABS}
      onCurrentTabChange={onEditorTabChange}
      initialTab={currentEditor}
      headerAppendix={editorHeaderAppendix}
    >
      <Editor />
      <ConfigEditor />
    </Panel>
  )
}

export default connect((state: StoreState) => {
  return {
    autoSync: state.main.preview.autoSync,
    currentEditor: state.main.currentEditor,
  }
})(EditorPanel)
