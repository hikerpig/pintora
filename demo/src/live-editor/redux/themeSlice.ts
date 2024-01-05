import { createSlice } from '@reduxjs/toolkit'
import { EXAMPLES } from '@pintora/test-shared'

export type State = {
  examples: typeof EXAMPLES
}

const initialState: State = {
  examples: EXAMPLES,
}

const slice = createSlice({
  name: 'theme',
  initialState,
  reducers: {},
})

export const actions = slice.actions

export default slice
