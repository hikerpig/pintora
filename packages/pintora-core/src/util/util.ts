export function safeAssign<T>(base: Partial<T>, attrs: Partial<T>) {
  return Object.assign(base || {}, attrs)
}

export function compact<T>(list: T[]) {
  return list.filter(v => Boolean(v))
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
