/**
 * Trim number to a given precision
 */
export function toFixed(num: number, digits = 2) {
  return parseFloat(num.toFixed(digits))
}
