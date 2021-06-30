export function stripStartEmptyLines(input: string) {
  const lines = input.split('\n')
  return lines
    .reduce((acc: string[], line) => {
      if (line) acc.push(line)
      return acc
    }, [])
    .join('\n')
}
