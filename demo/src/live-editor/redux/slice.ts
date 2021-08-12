import { createSlice, DeepPartial, Draft, PayloadAction } from '@reduxjs/toolkit'
import { EXAMPLES } from '@pintora/test-shared'
import { DiagramsConf } from '@pintora/standalone'
import { ErrorInfo } from 'src/live-editor/type'

export type State = {
  currentEditor: 'code' | 'config'
  editor: {
    code: string
    error: ErrorInfo | null
  }
  configEditor: {
    code: string
  }
  preview: {
    code: string
    autoSync: boolean
    config: {
      renderer: 'svg' | 'canvas'
    }
    pintoraConfig: DeepPartial<DiagramsConf>
  }
}

const DEFAULT_CONFIG: DeepPartial<DiagramsConf> = {
  themeConfig: {
    theme: 'default',
  },
}

const initialState: State = {
  currentEditor: 'code',
  editor: {
    code: EXAMPLES.sequence.code,
    error: null,
  },
  configEditor: {
    code: JSON.stringify(DEFAULT_CONFIG, null, 2),
  },
  preview: {
    code: EXAMPLES.sequence.code,
    autoSync: true,
    config: {
      renderer: 'svg',
    },
    pintoraConfig: {},
  },
}

function syncPreviewPintoraConfig(state: Draft<State>, code: string) {
  try {
    const pintoraConfig = JSON.parse(code)
    state.preview.pintoraConfig = pintoraConfig
  } catch (error) {
    console.warn('Error when parsing state.configEditor.code')
  }
}

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    updateEditorCode(state, action: PayloadAction<{ code: string; syncToPreview?: boolean }>) {
      const { code, syncToPreview } = action.payload
      state.editor.code = code
      if (syncToPreview || state.preview.autoSync) {
        state.preview.code = code
      }
    },
    updateEditorError(state, action: PayloadAction<{ errorInfo: ErrorInfo | null }>){
      const { errorInfo } = action.payload
      state.editor.error = errorInfo
    },
    updateConfigCode(state, action: PayloadAction<{ code: string; syncToPreview?: boolean }>) {
      const { code, syncToPreview } = action.payload
      state.configEditor.code = code
      if (syncToPreview || state.preview.autoSync) {
        syncPreviewPintoraConfig(state, state.configEditor.code)
      }
    },
    setCurrentEditor(state, action: PayloadAction<{ editor: string }>) {
      const { editor } = action.payload
      state.currentEditor = editor as any
    },
    updatePreviewConfig(state, action: PayloadAction<Partial<State['preview']['config']>>) {
      Object.assign(state.preview.config, action.payload)
    },
    updateAutoSync(state, action: PayloadAction<boolean>) {
      state.preview.autoSync = action.payload
    },
    refreshPreview(state) {
      state.preview.code = state.editor.code
      syncPreviewPintoraConfig(state, state.configEditor.code)
    },
  },
})

export const actions = appSlice.actions

export default appSlice
