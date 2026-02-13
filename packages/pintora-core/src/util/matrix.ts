import { mat3 } from 'gl-matrix'

export { mat3 }

export function createMat3() {
  return mat3.create() as number[]
}

export function createTranslation(x: number, y = 0) {
  return mat3.fromTranslation(mat3.create(), [x, y])
}

// gl-matrix extension methods (equivalent to @antv/matrix-util/ext)

/**
 * Left multiply translation matrix
 * out = translationMatrix * a
 */
export function leftTranslate(out: mat3, a: mat3, v: [number, number]): mat3 {
  const transMat = mat3.create()
  mat3.fromTranslation(transMat, v)
  return mat3.multiply(out, transMat, a)
}

/**
 * Left multiply rotation matrix
 * out = rotationMatrix * a
 */
export function leftRotate(out: mat3, a: mat3, rad: number): mat3 {
  const rotateMat = mat3.create()
  mat3.fromRotation(rotateMat, rad)
  return mat3.multiply(out, rotateMat, a)
}

/**
 * Left multiply scale matrix
 * out = scaleMatrix * a
 */
export function leftScale(out: mat3, a: mat3, v: [number, number]): mat3 {
  const scaleMat = mat3.create()
  mat3.fromScaling(scaleMat, v)
  return mat3.multiply(out, scaleMat, a)
}

/**
 * Transform matrix by actions
 * @param m - initial matrix, defaults to identity
 * @param actions - array of transform actions
 * @returns transformed matrix
 */
export function transform(
  m: mat3 | null | undefined,
  actions: Array<['t', number, number] | ['r', number] | ['s', number, number] | ['m', mat3]>
): mat3 {
  const matrix = m ? mat3.clone(m) : mat3.create()

  for (let i = 0, len = actions.length; i < len; i++) {
    const action = actions[i]
    switch (action[0]) {
      case 't':
        leftTranslate(matrix, matrix, [action[1], action[2]])
        break
      case 's':
        leftScale(matrix, matrix, [action[1], action[2]])
        break
      case 'r':
        leftRotate(matrix, matrix, action[1])
        break
      case 'm':
        mat3.multiply(matrix, action[1], matrix)
        break
      default:
        break
    }
  }
  return matrix
}

/**
 * Rotate, with point (x, y) as the center
 */
export function createRotateAtPoint(x: number, y: number, rotate: number) {
  const newMatrix = transform(undefined, [
    ['t', -x, -y],
    ['r', rotate],
    ['t', x, y],
  ])
  return newMatrix
}

// For backward compatibility
export const translate = leftTranslate
