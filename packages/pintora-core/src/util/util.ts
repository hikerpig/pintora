export function safeAssign<T>(base: Partial<T>, attrs: Partial<T>) {
  return Object.assign(base || {}, attrs)
}

export function pick<T, K extends keyof T>(base: Partial<T>, keys: K[]): { [key in K]: T[key] } {
  const out: any = {}
  keys.forEach(k => (out[k] = base[k]))
  return out
}

export function compact<T>(list: T[]) {
  return list.filter(v => Boolean(v))
}

export function unique<T>(list: T[]): T[] {
  const map = new Map()
  const result: T[] = []
  list.forEach(item => {
    if (map.has(item)) return
    map.set(item, item)
    result.push(item)
  })
  return result
}

const CHARACTERS = '0123456789abcdef'
export function makeid(length: number) {
  let result = ''
  const CHARACTERSLength = CHARACTERS.length
  for (let i = 0; i < length; i++) {
    result += CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERSLength))
  }
  return result
}

export function makeIdCounter(offset = 0) {
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

export function last<T>(list: T[] | undefined) {
  if (!(list && list.length)) return
  return list[list.length - 1]
}
