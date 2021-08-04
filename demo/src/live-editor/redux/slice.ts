import { createSlice, DeepPartial, PayloadAction } from '@reduxjs/toolkit'
import { EXAMPLES } from '@pintora/test-shared'
import { DiagramsConf } from '@pintora/standalone'

export type State = {
  currentEditor: 'code' | 'config'
  editor: {
    code: string
  }
  configEditor: {
    code: string
  }
  preview: {
    code: string
    config: {
      renderer: 'svg' | 'canvas'
    }
  }
}

const DEFAULT_CONFIG: DeepPartial<DiagramsConf> = {
  core: {
    theme: 'default',
  },
}

const initialState: State = {
  currentEditor: 'code',
  editor: {
    code: EXAMPLES.sequence.code,
  },
  configEditor: {
    code: JSON.stringify(DEFAULT_CONFIG, null, 2),
  },
  preview: {
    code: EXAMPLES.sequence.code,
    config: {
      renderer: 'svg',
    },
  },
}

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    updateEditorCode(state, action: PayloadAction<{ code: string; syncToPreview?: boolean }>) {
      const { code, syncToPreview } = action.payload
      state.editor.code = code
      if (syncToPreview) {
        state.preview.code = code
      }
    },
    updateConfigCode(state, action: PayloadAction<{ code: string }>) {
      const { code } = action.payload
      state.configEditor.code = code
    },
    setCurrentEditor(state, action: PayloadAction<{ editor: string }>) {
      const { editor } = action.payload
      state.currentEditor = editor as any
    },
    updatePreviewConfig(state, action: PayloadAction<Partial<State['preview']['config']>>) {
      Object.assign(state.preview.config, action.payload)
    },
  },
})

export const actions = appSlice.actions

export default appSlice
