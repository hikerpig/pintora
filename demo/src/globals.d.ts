import type { pintoraStandalone } from '@pintora/standalone'
import { DOMAttributes } from 'react'

declare global {
  interface Window {
    pintora: typeof pintoraStandalone
  }
}

type CustomElement<T> = Partial<T & DOMAttributes<T> & { children: any }>

declare global {
  namespace JSX {
    interface IntrinsicElements {
      ['iconify-icon']: CustomElement<XAlert>
    }
  }
}
