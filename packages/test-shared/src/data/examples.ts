import { stripStartEmptyLines } from '../util'
import { DiagramExample } from '../type'

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
    int orderNumber PK
    string deliveryAddress
  }
`),
}

export const erLargeExample: DiagramExample = {
  name: 'Large ER Diagram',
  description: 'Sample for a erDiagram representing a database',
  code: stripStartEmptyLines(`
erDiagram
  artists {
    INTEGER ArtistId
    NVARCHAR Name
  }

  employees {
    INTEGER EmployeeId
    NVARCHAR LastName
    NVARCHAR FirstName
    NVARCHAR Title
    INTEGER ReportsTo
    DATETIME BirthDate
    DATETIME HireDate
    NVARCHAR Address
    NVARCHAR City
    NVARCHAR State
    NVARCHAR Country
    NVARCHAR PostalCode
    NVARCHAR Phone
    NVARCHAR Fax
    NVARCHAR Email
  }

  genres {
    INTEGER GenreId
    NVARCHAR Name
  }

  media_types {
    INTEGER MediaTypeId
    NVARCHAR Name
  }

  playlists {
    INTEGER PlaylistId
    NVARCHAR Name
  }

  albums {
    INTEGER AlbumId
    NVARCHAR Title
    INTEGER ArtistId
  }

  customers {
    INTEGER CustomerId
    NVARCHAR FirstName
    NVARCHAR LastName
    NVARCHAR Company
    NVARCHAR Address
    NVARCHAR City
    NVARCHAR State
    NVARCHAR Country
    NVARCHAR PostalCode
    NVARCHAR Phone
    NVARCHAR Fax
    NVARCHAR Email
    INTEGER SupportRepId
  }

  invoices {
    INTEGER InvoiceId
    INTEGER CustomerId
    DATETIME InvoiceDate
    NVARCHAR BillingAddress
    NVARCHAR BillingCity
    NVARCHAR BillingState
    NVARCHAR BillingCountry
    NVARCHAR BillingPostalCode
    NUMERIC Total
  }

  tracks {
    INTEGER TrackId
    NVARCHAR Name
    INTEGER AlbumId
    INTEGER MediaTypeId
    INTEGER GenreId
    NVARCHAR Composer
    INTEGER Milliseconds
    INTEGER Bytes
    NUMERIC UnitPrice
  }

  invoice_items {
    INTEGER InvoiceLineId
    INTEGER InvoiceId
    INTEGER TrackId
    NUMERIC UnitPrice
    INTEGER Quantity
  }

  playlist_track {
    INTEGER PlaylistId
    INTEGER TrackId
  }

  artists ||--o{ albums : "foreign key"

  employees ||--o{ customers : "foreign key"

  genres ||--o{ tracks : "foreign key"

  media_types ||--o{ tracks : "foreign key"

  playlists ||--o{ playlist_track : "foreign key"

  albums ||--o{ tracks : "foreign key"

  customers ||--o{ invoices : "foreign key"

  invoices ||--o{ invoice_items : "foreign key"

  tracks ||--o{ invoice_items : "foreign key"
  tracks ||--o{ playlist_track : "foreign key"
`),
}

export const componentExample: DiagramExample = {
  name: 'Component Diagram',
  description: 'Sample for a componentDiagram',
  code: stripStartEmptyLines(`
componentDiagram
  package "@pintora/core" {
    () GraphicsIR
    () IRenderer
    () IDiagram
    [Diagram Registry] as registry
  }
  package "@pintora/diagrams" {
    [...Multiple Diagrams...] as diagrams
    [diagrams]
    [diagrams] --> IDiagram : implements
  }
  package "@pintora/renderer" {
    () "render()" as renderFn
    [SVGRender]
    [CanvasRender]
    [SVGRender] --> IRenderer : implements
    [CanvasRender] --> IRenderer : implements
    IRenderer ..> GraphicsIR : accepts
  }
  package "@pintora/standalone" {
    [standalone]
  }
  [IDiagram] --> GraphicsIR : generate
  [standalone] --> registry : register all of @pintora/diagrams
  [standalone] --> [@pintora/diagrams] : import
  [standalone] --> renderFn : call with GraphicsIR
  `),
}

export const EXAMPLES = {
  sequence: sequenceExample,
  er: erExample,
  erLarge: erLargeExample,
  component: componentExample,
}
