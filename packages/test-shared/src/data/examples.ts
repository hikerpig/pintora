import { stripStartEmptyLines } from '../util'

type DiagramExample = {
  name: string
  description: string
  code: string
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
  @note over User,Pintora: note over
  @note right of User: note aside actor
  @note right of User
  multiline note
  is possible
  @end_note
  == Divider ==
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

export const erExample: DiagramExample = {
  name: 'ER Diagram',
  description: 'Sample for erDiagram',
  code: stripStartEmptyLines(`
erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE-ITEM : contains
  CUSTOMER }|..|{ DELIVERY-ADDRESS : uses
  ORDER {
    int orderNumber
    string deliveryAddress
  }
`),
}

export const EXAMPLES = {
  sequence: sequenceExample,
  er: erExample,
}
