export function safeAssign<T>(base: Partial<T>, attrs: Partial<T>) {
  return Object.assign(base || {}, attrs)
}

export function compact<T>(list: T[]) {
  return list.filter(v => Boolean(v))
}
