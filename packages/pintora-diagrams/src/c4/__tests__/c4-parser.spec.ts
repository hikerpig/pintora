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

  it('throws for unsupported dynamic and deployment entries', () => {
    expect(() => {
      parse(
        stripStartEmptyLines(`
C4Dynamic
Person(customer, "Customer")
        `),
      )
    }).toThrow('[c4] C4Dynamic is recognized but not supported by the first C4 implementation')
  })
})
