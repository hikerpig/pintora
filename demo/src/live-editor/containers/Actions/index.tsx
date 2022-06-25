import React from 'react'
import toast, { Toaster } from 'react-hot-toast'
import pintora from '@pintora/standalone'
import Buttons from 'src/live-editor/components/Buttons'
import { fileSave, fileOpen } from 'src/utils/filesystem'
import store from '../../redux/store'
import { MIME_TYPES, DEMO_BASE_URL } from 'src/const'
import { actions } from 'src/live-editor/redux/slice'

interface ActionsProps {}

function renderPintora(code: string, rendererType: any) {
  const container = document.createElement('div')
  return new Promise<any>((resolve, reject) => {
    pintora.renderTo(code, {
      container,
      renderer: rendererType,
      onRender(renderer) {
        resolve(renderer)
      },
      onError(error) {
        console.error(error)
        reject(error)
      },
    })
  })
}

function getSvgString(renderer: any) {
  const svg = renderer.getRootElement()
  if (svg) {
    const serializer = new XMLSerializer()
    const str = serializer.serializeToString(svg)
    return str
  }
}

type ActionButtonDef = {
  label: string
  description: string
  action(): void
}

const ACION_BUTTONS: ActionButtonDef[] = [
  {
    label: 'Download PNG',
    description: 'Will use canvas renderer',
    action() {
      const state = store.getState()
      renderPintora(state.main.editor.code, 'canvas').then(renderer => {
        const canvas: HTMLCanvasElement = renderer.getRootElement()
        setTimeout(() => {
          const dataURL = canvas.toDataURL('image/png;base64', 0.9)
          const filename = `pintora-output-${Date.now()}.png`
          const element = document.createElement('a')
          element.setAttribute('href', dataURL)
          element.setAttribute('download', filename)
          element.click()
        }, 50) // wait after the painting is over
      })
    },
  },
  {
    label: 'Download SVG',
    description: 'Will use svg renderer',
    action() {
      const state = store.getState()
      renderPintora(state.main.editor.code, 'svg').then(renderer => {
        const str = getSvgString(renderer)
        if (str) {
          const element = document.createElement('a')
          const filename = `pintora-output-${Date.now()}.svg`
          element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(str))
          element.setAttribute('download', filename)
          element.click()
        }
      })
    },
  },
  {
    label: 'Copy Editor URL',
    description: 'Copy Current Editor URL',
    action() {
      const state = store.getState()
      const previewCode = state.main.preview.code
      const encodedCode = pintora.util.encodeForUrl(previewCode)
      const encodedPintoraConfig = pintora.util.encodeForUrl(JSON.stringify(state.main.preview.pintoraConfig))
      const a = document.createElement('a')
      a.href = `${DEMO_BASE_URL}live-editor/?code=${encodedCode}&config=${encodedPintoraConfig}`
      const url = a.href
      navigator.clipboard.writeText(url).then(() => {
        toast.success('Editor and code URL is copied', {
          position: 'bottom-center',
        })
      })
    },
  },
  {
    label: 'Save Code',
    description: 'Save code to disk',
    action() {
      const state = store.getState()
      const content = state.main.editor.code
      fileSave(new Blob([content], { type: MIME_TYPES.pintora }), {
        name: 'pintora-code',
        extension: 'pintora',
        description: 'Save file',
      })
    },
  },
  {
    label: 'Load Code',
    description: 'Load code from disk',
    async action() {
      const file = await fileOpen({
        description: 'Pintora code',
        extensions: ['pintora'],
      })
      const text = await file.text()
      store.dispatch(
        actions.updateEditorCode({
          code: text,
        }),
      )
    },
  },
]

const Actions = ({}: ActionsProps) => {
  return (
    <div className="Actions">
      <Buttons>
        {ACION_BUTTONS.map(def => {
          return (
            <button className="btn btn-primary btn-sm" key={def.label} onClick={def.action} title={def.description}>
              {def.label}
            </button>
          )
        })}
      </Buttons>
      <Toaster />
    </div>
  )
}

export default Actions
