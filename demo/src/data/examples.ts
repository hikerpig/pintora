type DiagramExample = {
  name: string
  description: string
  code: string
}

function stripStartEmptyLines(input: string) {
  const lines = input.split('\n')
  return lines
    .reduce((acc: string[], line) => {
      if (line) acc.push(line)
      return acc
    }, [])
    .join('\n')
}

export const sequenceExample: DiagramExample = {
  name: 'Sequence Diagram',
  description: 'Sample',
  code: stripStartEmptyLines(`
sequenceDiagram
  autonumber
  User->>+Pintora: render this
  activate Pintora
  loop Check input
    Pintora-->>Pintora: Has input changed?
  end
  Pintora-->>User: your figure here
  deactivate Pintora
  Note over User,Pintora: Note over
  Note right of User: Note aside actor
`),
}

export const sequenceLineExample = stripStartEmptyLines(`
sequenceDiagram
    John-->>Alice: Line example 1
    John--xAlice: Line example 2
    John-xAlice: Line example 3
    John-)Alice: Line example 4
    John--)Alice: Line example 5
    John->Alice: Line example 6
`)

export const EXAMPLES = {
  sequence: sequenceExample,
}
