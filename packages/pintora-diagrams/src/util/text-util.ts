interface IFont {
  fontFamily: string
  fontSize: number
  fontWeight: number | string
}

const CHARACTERS = '0123456789abcdef'
export function makeid(length: number) {
  let result = ''
  let CHARACTERSLength = CHARACTERS.length
  for (let i = 0; i < length; i++) {
    result += CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERSLength))
  }
  return result
}

// TODO: this should be implemented in the core package, here is just a simple mock
export function calculateTextDimensions(text: string, font?: IFont) {
  const lines = text.split('\n')
  let width = 0
  let height = 0
  const fontSize = font?.fontSize || 14
  lines.forEach((line, i) => {
    const w = line.length * fontSize
    width = Math.max(w, width)
    height += fontSize + (i === 0 ? 0 : 8)
  })
  // console.log('calculateTextDimensions', text, width, height)
  return {
    width,
    height,
  }
}
