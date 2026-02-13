export type Charset = 'unicode' | 'ascii'
export type Matrix = number[]
export type Point = {
  x: number
  y: number
}

export const DIR_N = 1
export const DIR_E = 2
export const DIR_S = 4
export const DIR_W = 8

export const DIAGONAL_FORWARD = 1
export const DIAGONAL_BACKWARD = 2

export const IDENTITY_MATRIX: Matrix = [1, 0, 0, 0, 1, 0, 0, 0, 1]
