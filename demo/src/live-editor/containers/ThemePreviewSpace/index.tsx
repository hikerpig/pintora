import React, { useEffect } from 'react'
import { StoreState } from 'src/live-editor/redux/store'
import PintoraPreview from 'src/components/PintoraPreview'
import { connect, ConnectedProps } from 'react-redux'
import pintora, { PintoraConfig } from '@pintora/standalone'
import Panel from 'src/live-editor/components/Panel'
import './ThemePreviewSpace.less'

function ThemePreviewSpace(props: Props) {
  const { examples, themeConfig } = props
  useEffect(() => {
    return () => {
      pintora.setConfig({
        themeConfig: themeConfig,
      })
    }
  }, [themeConfig])

  const examplesToRender = Object.values(examples).filter(example => !['Large ER Diagram'].includes(example.name))

  return (
    <div className="flex ThemePreviewSpace">
      <Panel title="Theme Preview">
        <div className="flex flex-wrap">
          {examplesToRender.map(example => {
            return (
              <div key={example.name}>
                <div className="ThemePreviewSpace__item-title"><b>{example.name}</b></div>
                <PintoraPreview key={example.name} renderer='canvas' code={example.code} />
              </div>
            )
          })}
        </div>
      </Panel>
    </div>
  )
}

const connector = connect((state: StoreState) => {
  let config: PintoraConfig | null = null
  try {
    config = JSON.parse(state.main.configEditor.code)
  } catch (error) {
    console.error('error parsing', error)
  }
  return {
    examples: state.theme.examples,
    themeConfig: config ? config.themeConfig : { theme: 'default' },
  }
})

type Props = ConnectedProps<typeof connector>

export default connector(ThemePreviewSpace)
