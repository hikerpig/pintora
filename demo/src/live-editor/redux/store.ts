import { configureStore } from '@reduxjs/toolkit'
import slice from './slice'
import theme from './themeSlice'

const store = configureStore({
  reducer: {
    main: slice.reducer,
    theme: theme.reducer,
  },
})

export type StoreState = ReturnType<typeof store.getState>

export default store
