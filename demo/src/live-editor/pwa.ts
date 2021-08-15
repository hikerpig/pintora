import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    console.log('[pwa] onNeedRefresh')
  },
  onOfflineReady() {
    // show a ready to work offline to user
    console.log('[pwa] onOfflineReady')
  },
})

updateSW()
