export function safeAssign<T>(base: Partial<T>, ...attrList: Array<Partial<T>>) {
  return Object.assign(base || {}, ...attrList)
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

export function min<T>(arr: T[], fn: (v: T) => number) {
  return Math.min(...arr.map(fn))
}

export function max<T>(arr: T[], fn: (v: T) => number) {
  return Math.max(...arr.map(fn))
}

/**
 * Remove certain value keys from an object, usually empty value
 * @mutate obj
 */
export function removeValues<T extends object>(obj: T, values = [undefined, null]) {
  for (const [k, v] of Object.entries(obj)) {
    if (values.includes(v)) delete (obj as any)[k]
  }
  return obj
}
