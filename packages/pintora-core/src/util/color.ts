const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3}){1,2}$/

export function parseColor(input: string) {
  let isValid = false
  let color = input
  if (HEX_PATTERN.test(input)) {
    color = input
    isValid = true
  } else {
    color = input.replace('#', '')
  }
  return {
    color,
    isValid,
  }
}
