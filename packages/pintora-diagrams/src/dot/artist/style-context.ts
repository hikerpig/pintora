export type StyleValue<V = string> = {
  v: V
}

type ResolveResult<V = string> = {
  resolved: boolean
  value: V
}

export class StyleContext<ValueMap = any> {
  parent?: StyleContext
  protected values: Record<keyof ValueMap, StyleValue> = {} as any

  setParent(c: StyleContext) {
    this.parent = c
  }

  /** Spawn a child context */
  spawn(): StyleContext<ValueMap> {
    const child = new StyleContext()
    child.setParent(this)
    return child
  }

  getValue<K extends keyof ValueMap>(key: K) {
    const result = this.resolve<K>(key)
    if (result.resolved) {
      return result.value
    }
    return undefined
  }

  set(key: string, v: any) {
    this.values[key] = { v }
  }

  setValues(obj: Partial<ValueMap>) {
    for (const [k, v] of Object.entries(obj)) {
      this.set(k, v)
    }
  }

  protected resolve<K extends keyof ValueMap>(key: K): ResolveResult<ValueMap[K]> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let current: StyleContext | undefined = this
    while (current) {
      if (current.values[key]) {
        return {
          resolved: true,
          value: current.values[key].v as any,
        }
      }
      current = current.parent
    }

    return {
      resolved: false,
      value: undefined,
    }
  }
}
