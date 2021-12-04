export function safeAssign<T>(base: Partial<T>, attrs: Partial<T>) {
  return Object.assign(base || {}, attrs)
}

export function pick<T, K extends keyof T>(base: Partial<T>, keys: K[]): { [key in K]: T[key] } {
  const out:any = {}
  keys.forEach(k => out[k] = base[k])
  return out
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

export function makeIdCounter(offset=0) {
  let v = offset
  return {
    reset() {
      v = offset
    },
    next() {
      v++
      return v.toString()
    },
  }
}
