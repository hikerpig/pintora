import type { pintoraStandalone } from '@pintora/standalone'

declare global {
  interface Window {
    pintora: typeof pintoraStandalone
  }
}
