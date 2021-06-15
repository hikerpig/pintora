import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { EXAMPLES } from '@pintora/test-shared'

export type State = {
  editor: {
    code: string
  }
  preview: {
    code: string
    config: {
      renderer: 'svg' | 'canvas'
    }
  }
}

const initialState: State = {
  editor: {
    code: EXAMPLES.sequence.code,
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
    updatePreviewConfig(state, action: PayloadAction<Partial<State['preview']['config']>>) {
      Object.assign(state.preview.config, action.payload)
    },
  },
})

export const actions = appSlice.actions

export default appSlice
