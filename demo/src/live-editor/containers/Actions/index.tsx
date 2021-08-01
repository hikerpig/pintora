import React from 'react'
import pintora from '@pintora/standalone'
import Buttons from 'src/live-editor/components/Buttons'
import store from '../../redux/store'

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
      renderPintora(state.editor.code, 'canvas').then(renderer => {
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
      renderPintora(state.editor.code, 'svg').then(renderer => {
        const str = getSvgString(renderer)
        if (str) {
          var element = document.createElement('a')
          const filename = `pintora-output-${Date.now()}.svg`
          element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(str))
          element.setAttribute('download', filename)
          element.click()
        }
      })
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
    </div>
  )
}

export default Actions
