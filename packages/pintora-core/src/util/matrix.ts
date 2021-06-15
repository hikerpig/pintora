import { mat3, ext } from '@antv/matrix-util'

export { mat3 }

export function createMat3() {
  return mat3.create() as number[]
}

export function createTranslation(x: number, y = 0) {
  return mat3.fromTranslation(mat3.create(), [x, y])
}

export const transform = ext.transform

export const translate = ext.leftTranslate

export const leftRotate = ext.leftRotate

/**
 * 以任意点 (x, y) 为中心旋转元素
 * @param {number} radian 旋转角度(弧度值)
 * @return {IElement} 元素
 */
export function createRotateAtPoint(x: number, y: number, rotate: number) {
  const newMatrix = transform(undefined as any, [
    ['t', -x, -y],
    ['r', rotate],
    ['t', x, y],
  ])
  return newMatrix
}
