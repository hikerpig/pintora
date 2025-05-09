export const isDev = globalThis.isPintoraDev ?? false

export const pintoraDevGlobals = {}

export function setDevGlobal(key: string, value: unknown) {
  pintoraDevGlobals[key] = value
  if (isDev) {
    globalThis.pintoraDevGlobals = pintoraDevGlobals
  }
}
