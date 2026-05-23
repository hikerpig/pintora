import { stripStartEmptyLines } from '@pintora/test-shared'
import db from '../db'
import { parse } from '../parser'

describe('c4 parser', () => {
  afterEach(() => {
    db.clear()
  })

  it('parses C4Container elements, boundary, and relationships', () => {
    parse(
      stripStartEmptyLines(`
C4Container
title: Internet Banking - Containers

Person(customer, "Customer", "A retail banking customer")
System_Boundary(banking, "Internet Banking System") {
  Container(web, "Web Application", "React", "Delivers the single-page app")
  Container(api, "API Application", "Spring Boot", "Handles business requests")
  ContainerDb(db, "Database", "PostgreSQL", "Stores account data")
}
System_Ext(email, "E-mail System", "Sends notifications")

Rel(customer, web, "Uses", "HTTPS")
Rel(web, api, "Calls", "JSON/HTTPS")
Rel(api, db, "Reads/Writes", "JDBC")
Rel_R(api, email, "Sends messages", "SMTP")
      `),
    )

    const ir = db.getDiagramIR()

    expect(ir.diagramKind).toBe('container')
    expect(ir.title).toBe('Internet Banking - Containers')
    expect(ir.elements).toMatchObject({
      customer: {
        id: 'customer',
        kind: 'person',
        shape: 'person',
        label: 'Customer',
        description: 'A retail banking customer',
        tags: [],
        itemId: 'c4-element-customer',
      },
      web: {
        id: 'web',
        kind: 'container',
        shape: 'box',
        label: 'Web Application',
        technology: 'React',
        description: 'Delivers the single-page app',
        parent: 'banking',
      },
      db: {
        id: 'db',
        kind: 'container',
        shape: 'database',
        label: 'Database',
        technology: 'PostgreSQL',
      },
      email: {
        id: 'email',
        kind: 'system',
        external: true,
        label: 'E-mail System',
      },
    })
    expect(ir.boundaries).toMatchObject({
      banking: {
        id: 'banking',
        kind: 'system',
        label: 'Internet Banking System',
        children: ['web', 'api', 'db'],
        itemId: 'c4-boundary-banking',
      },
    })
    expect(ir.relationships).toMatchObject([
      {
        source: 'customer',
        target: 'web',
        label: 'Uses',
        technology: 'HTTPS',
        tags: [],
        itemId: 'c4-rel-0',
      },
      {
        source: 'web',
        target: 'api',
        label: 'Calls',
        technology: 'JSON/HTTPS',
      },
      {
        source: 'api',
        target: 'db',
        label: 'Reads/Writes',
        technology: 'JDBC',
      },
      {
        source: 'api',
        target: 'email',
        label: 'Sends messages',
        technology: 'SMTP',
        directionHint: 'right',
      },
    ])
  })

  it('parses named optional arguments and tags', () => {
    parse(
      stripStartEmptyLines(`
C4Context
Person(customer, "Customer", $descr="Uses the service", $tags="person,external-user", $link="https://example.com/customer")
System(api, "API", $descr="Public API")
Rel(customer, api, "Uses", $techn="HTTPS", $tags="critical")
      `),
    )

    const ir = db.getDiagramIR()

    expect(ir.diagramKind).toBe('context')
    expect(ir.elements.customer).toMatchObject({
      id: 'customer',
      description: 'Uses the service',
      tags: ['person', 'external-user'],
      link: 'https://example.com/customer',
    })
    expect(ir.relationships[0]).toMatchObject({
      technology: 'HTTPS',
      tags: ['critical'],
    })
  })

  it('parses external database and queue element variants', () => {
    parse(
      stripStartEmptyLines(`
C4Container
SystemDb_Ext(systemDb, "External System DB", "Stores external data")
SystemQueue_Ext(systemQueue, "External System Queue", "Queues external events")
ContainerDb_Ext(containerDb, "External Container DB", "PostgreSQL", "Stores app data")
ContainerQueue_Ext(containerQueue, "External Container Queue", "Kafka", "Queues app events")
ComponentDb_Ext(componentDb, "External Component DB", "SQLite", "Stores component data")
ComponentQueue_Ext(componentQueue, "External Component Queue", "Redis", "Queues component events")
    `),
    )

    const ir = db.getDiagramIR()

    expect(ir.elements.systemDb).toMatchObject({ kind: 'system', shape: 'database', external: true })
    expect(ir.elements.systemQueue).toMatchObject({ kind: 'system', shape: 'queue', external: true })
    expect(ir.elements.containerDb).toMatchObject({
      kind: 'container',
      shape: 'database',
      external: true,
      technology: 'PostgreSQL',
    })
    expect(ir.elements.containerQueue).toMatchObject({
      kind: 'container',
      shape: 'queue',
      external: true,
      technology: 'Kafka',
    })
    expect(ir.elements.componentDb).toMatchObject({
      kind: 'component',
      shape: 'database',
      external: true,
      technology: 'SQLite',
    })
    expect(ir.elements.componentQueue).toMatchObject({
      kind: 'component',
      shape: 'queue',
      external: true,
      technology: 'Redis',
    })
  })

  it('parses empty quoted optional arguments and richer title text', () => {
    parse(
      stripStartEmptyLines(`
C4Container
title: 2026 API (v2) / Containers
System(api, "API", "")
Container(web, "Web", "React", "")
      `),
    )

    const ir = db.getDiagramIR()

    expect(ir.title).toBe('2026 API (v2) / Containers')
    expect(ir.elements.api).toMatchObject({
      id: 'api',
      label: 'API',
    })
    expect(ir.elements.api.description).toBeUndefined()
    expect(ir.elements.web).toMatchObject({
      id: 'web',
      label: 'Web',
      technology: 'React',
    })
    expect(ir.elements.web.description).toBeUndefined()
  })

  it('parses C4Component and bidirectional relationships', () => {
    parse(
      stripStartEmptyLines(`
C4Component
Container_Boundary(api, "API Application") {
  Component(controller, "Account Controller", "TypeScript", "Handles HTTP requests")
  Component(service, "Account Service", "TypeScript", "Applies business rules")
}
BiRel(controller, service, "Calls")
      `),
    )

    const ir = db.getDiagramIR()

    expect(ir.diagramKind).toBe('component')
    expect(ir.boundaries.api).toMatchObject({
      id: 'api',
      kind: 'container',
      children: ['controller', 'service'],
    })
    expect(ir.relationships[0]).toMatchObject({
      source: 'controller',
      target: 'service',
      bidirectional: true,
    })
  })

  it('parses C4Dynamic and preserves RelIndex order labels', () => {
    parse(
      stripStartEmptyLines(`
C4Dynamic
Container(web, "Web", "React")
Container(api, "API", "Node.js")
ContainerDb(db, "Database", "PostgreSQL")
RelIndex(1, web, api, "Submits request", "JSON/HTTPS")
RelIndex(2, api, db, "Reads data", "SQL")
      `),
    )

    const ir = db.getDiagramIR()

    expect(ir.diagramKind).toBe('dynamic')
    expect(ir.relationships).toMatchObject([
      {
        source: 'web',
        target: 'api',
        index: '1',
        label: 'Submits request',
        technology: 'JSON/HTTPS',
        itemId: 'c4-rel-0',
      },
      {
        source: 'api',
        target: 'db',
        index: '2',
        label: 'Reads data',
        technology: 'SQL',
        itemId: 'c4-rel-1',
      },
    ])
  })

  it('treats RelIndex fifth positional argument as tags when it matches declared relationship tags', () => {
    parse(
      stripStartEmptyLines(`
C4Dynamic
AddRelTag("async", $lineColor="#0066cc", $lineStyle=DashedLine())
Container(web, "Web", "React")
Container(api, "API", "Node.js")
RelIndex(1, web, api, "Calls", "async")
    `),
    )

    const rel = db.getDiagramIR().relationships[0]
    expect(rel.tags).toEqual(['async'])
    expect(rel.technology).toBeUndefined()
  })

  it('parses C4Deployment deployment nodes as nested boundaries', () => {
    parse(
      stripStartEmptyLines(`
C4Deployment
Deployment_Node(region, "AWS Region", "us-east-1") {
  Node(cluster, "EKS Cluster", "Kubernetes") {
    Container(api, "API", "Node.js")
  }
}
Rel(api, region, "Runs in")
      `),
    )

    const ir = db.getDiagramIR()

    expect(ir.diagramKind).toBe('deployment')
    expect(ir.boundaries.region).toMatchObject({
      id: 'region',
      kind: 'deploymentNode',
      label: 'AWS Region',
      type: 'us-east-1',
      children: ['cluster'],
      itemId: 'c4-boundary-region',
    })
    expect(ir.boundaries.cluster).toMatchObject({
      id: 'cluster',
      kind: 'deploymentNode',
      label: 'EKS Cluster',
      type: 'Kubernetes',
      parent: 'region',
      children: ['api'],
    })
    expect(ir.elements.api).toMatchObject({
      id: 'api',
      parent: 'cluster',
    })
  })

  it('parses regular boundary type separately from description', () => {
    parse(
      stripStartEmptyLines(`
C4Context
Boundary(edge, "Edge Zone", "Network zone", $descr="Public subnet") {
  System(api, "API")
}
    `),
    )

    expect(db.getDiagramIR().boundaries.edge).toMatchObject({
      type: 'Network zone',
      description: 'Public subnet',
    })
  })

  it('parses tag declarations and explicit legend calls', () => {
    parse(
      stripStartEmptyLines(`
C4Container
AddElementTag("critical", $bgColor="#ffdddd", $fontColor="#550000", $borderColor="#cc0000", $shape=RoundedBoxShape(), $legendText="Critical element")
AddRelTag("async", $textColor="#003366", $lineColor="#0066cc", $lineStyle=DashedLine(), $legendText="Async call")
Container(api, "API", "Node.js", $tags="critical")
ContainerQueue(events, "Events", "Kafka")
Rel(api, events, "Publishes", $tags="async")
SHOW_LEGEND()
      `),
    )

    const ir = db.getDiagramIR()

    expect(ir.elementTags.critical).toMatchObject({
      tag: 'critical',
      bgColor: '#ffdddd',
      fontColor: '#550000',
      borderColor: '#cc0000',
      shape: 'roundedBox',
      legendText: 'Critical element',
    })
    expect(ir.relationshipTags.async).toMatchObject({
      tag: 'async',
      textColor: '#003366',
      lineColor: '#0066cc',
      lineStyle: 'dashed',
      legendText: 'Async call',
    })
    expect(ir.legend).toMatchObject({
      visible: true,
    })
  })

  it('parses UpdateElementStyle declarations', () => {
    parse(
      stripStartEmptyLines(`
C4Container
Container(api, "API", "Node.js")
UpdateElementStyle(api, $bgColor="#ddeeff", $fontColor="#001144", $borderColor="#003399", $shape=RoundedBoxShape(), $techn="Express")
    `),
    )

    expect(db.getDiagramIR().elementStyleOverrides.api).toMatchObject({
      elementId: 'api',
      bgColor: '#ddeeff',
      fontColor: '#001144',
      borderColor: '#003399',
      shape: 'roundedBox',
      techn: 'Express',
    })
  })

  it('parses UpdateRelStyle declarations', () => {
    parse(
      stripStartEmptyLines(`
C4Container
Container(api, "API", "Node.js")
Container(db, "DB", "PostgreSQL")
Rel(api, db, "Reads")
UpdateRelStyle(api, db, $textColor="#003366", $lineColor="#0066cc", $offsetX="10", $offsetY="-5")
    `),
    )

    expect(db.getDiagramIR().relationshipStyleOverrides[0]).toMatchObject({
      source: 'api',
      target: 'db',
      textColor: '#003366',
      lineColor: '#0066cc',
      offsetX: '10',
      offsetY: '-5',
    })
  })

  it('parses UpdateLayoutConfig as compatibility metadata', () => {
    parse(
      stripStartEmptyLines(`
C4Container
UpdateLayoutConfig(3, 1)
Container(api, "API", "Node.js")
    `),
    )

    expect(db.getDiagramIR().layoutConfig).toEqual({
      c4ShapeInRow: 3,
      c4BoundaryInRow: 1,
    })
  })

  it('parses C4-PlantUML and Mermaid-style legend aliases', () => {
    parse(
      stripStartEmptyLines(`
C4Dynamic
Container(api, "API", "Node.js")
SHOW_DYNAMIC_LEGEND()
Legend
      `),
    )

    expect(db.getDiagramIR().legend.visible).toBe(true)
  })

  it('throws for unresolved relationship endpoints', () => {
    expect(() => {
      parse(
        stripStartEmptyLines(`
C4Context
Person(customer, "Customer")
Rel(customer, missing, "Uses")
        `),
      )
    }).toThrow('[c4] relationship target is not declared: missing')
  })

  it('throws for unsupported diagram entries', () => {
    expect(() => {
      parse(
        stripStartEmptyLines(`
C4Whatever
Person(customer, "Customer")
        `),
      )
    }).toThrow('[c4] unsupported diagram entry: C4Whatever')
  })
})
