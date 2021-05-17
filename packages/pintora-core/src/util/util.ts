export function safeAssign<T>(base: Partial<T>, attrs: Partial<T>) {
  return Object.assign(base || {}, attrs)
}