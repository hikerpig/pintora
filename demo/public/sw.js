// sw.js
import { precacheAndRoute } from 'workbox-precaching'
import { clientsClaim, skipWaiting } from 'workbox-core'

// self.__WB_MANIFEST is default injection point
precacheAndRoute(self.__WB_MANIFEST)

skipWaiting()
clientsClaim()
