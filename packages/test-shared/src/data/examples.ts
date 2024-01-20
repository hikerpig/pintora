import { stripStartEmptyLines } from '../util'
import { DiagramExample } from '../type'

export const sequenceExample: DiagramExample = {
  name: 'Sequence Diagram',
  description: 'Sample',
  code: stripStartEmptyLines(`
sequenceDiagram
  title: Sequence Diagram Example
  autonumber
  User->>Pintora: render this
  activate Pintora
  loop Check input
    Pintora-->>Pintora: Has input changed?
  end
  Pintora-->>User: your figure here
  deactivate Pintora
  @note over User,Pintora: note over
  @note right of User: note aside actor
  @start_note right of User
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
  title: Entity Relationship Example

  PERSON {
    string phone "phone number"
  }

  CUSTOMER inherit PERSON
  DELIVERER inherit PERSON

  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE-ITEM : contains
  CUSTOMER }|..|{ DELIVERY-ADDRESS : uses
  ORDER {
    int order_number PK
    string adress "delivery address"
  }

  DELIVERER ||--o{ DELIVERY : completes
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
  title: Component Diagram Example

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
  [@pintora/standalone] --> [@pintora/diagrams] : import
  [standalone] --> renderFn : call with GraphicsIR
  `),
}

const activityExample: DiagramExample = {
  name: 'Activity Diagram',
  description: 'Sample for a activityDiagram',
  code: stripStartEmptyLines(`
activityDiagram
title: Activity Example
start
partition Init {
  :read config;
  :init internal services;
  note left: init themes
}
:Diagram requested;
if (diagram registered ?) then
  :get implementation;
else (no)
  :print error;
endif

switch ( renderer type )
case ( svg )
  :Generate svg;
case ( canvas )
  :Draw canvas;
case ( custom )
  :Custom renderer output;
endswitch

while (data available?) is (available)
  :read data;
  :generate diagrams;
endwhile (no)

end
  `),
}

export const mindmapExample: DiagramExample = {
  name: 'Mind Map',
  description: 'Sample for a mindmap',
  code: stripStartEmptyLines(`
mindmap
title: Mind Map Example
+ UML Diagrams
++ Behavior Diagrams
+++ Sequence Diagram
+++ State Diagram
+++ Activity Diagram
-- Structural Diagrams
--- Class Diagram
--- Component Diagram
`),
}

export const ganttExample: DiagramExample = {
  name: 'Gantt Diagram',
  description: 'Sample for a gantt diagram',
  code: stripStartEmptyLines(`
gantt
  title Gantt example

  excludes weekends

  section First
  A : t-a, 2022-2-17, 2022-2-23
  section Second
  B : t-b, after t-a, 2d
  C : t-c, after t-b, 2w
  section Third
  D : t-d, after t-c, 2d
`),
}

export const dotExample: DiagramExample = {
  name: 'DOT Diagram',
  description: 'Sample for a dotDiagram',
  code: stripStartEmptyLines(`
dotDiagram
  digraph G {
    bgcolor="white"
    label="Dot Diagram Example"

    // specify common node attributes
    node [color="#111",bgcolor=orange]

    subgraph S1 {
      // subgraph will inherit parent attributes
      label="Sub";
      a1 [fontcolor="purple"];
    }

    end [shape="diamond"];

    /* usually we put edges at the last */
    a1 -> b1 [arrowhead="odot"];

    c1 -> end [color="blue"];
    S1 -> end;
  }
`),
}

export const classExample: DiagramExample = {
  name: 'Class Diagram',
  description: 'Sample for a classDiagram',
  code: stripStartEmptyLines(`
classDiagram
  class Fruit {
    <<interface>>
    float sweetness
    -float age

    float getAge()
  }

  class Apple {
    float softness
    {static} Apple fromString(str)
  }

  %% There are so many kind of fruits
  Fruit <|-- Apple
  Fruit <|-- Banana

  Fruit "many" --* "1" Bag: packed into

  @note right of Fruit: The base class
`),
}

export const EXAMPLES = {
  sequence: sequenceExample,
  er: erExample,
  erLarge: erLargeExample,
  component: componentExample,
  activity: activityExample,
  mindmap: mindmapExample,
  gantt: ganttExample,
  dot: dotExample,
  class: classExample,
}
