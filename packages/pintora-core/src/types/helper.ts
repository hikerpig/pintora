export type OrNull<T> = T | null

export type Maybe<T> = T | undefined

export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>
}
