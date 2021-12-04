import { configureStore } from '@reduxjs/toolkit'
import slice from './slice'

const store = configureStore({
  reducer: slice.reducer,
})

export default store
