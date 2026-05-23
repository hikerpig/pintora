import { calculateTextDimensions, diagramRegistry, Group, Mark, symbolRegistry } from '@pintora/core'
import { EXAMPLES } from '@pintora/test-shared'
import { prepareDiagramConfig, stripDrawResultForSnapshot, testDraw } from '../../__tests__/test-util'
import { c4Diagram } from '../index'

function findC4ElementGroup(rootMark: Group, itemId: string) {
  return rootMark.children.find((child): child is Group => child.type === 'group' && child.itemId === itemId)!
}

function findC4GroupIndex(rootMark: Group, itemId: string) {
  return rootMark.children.findIndex(child => child.type === 'group' && child.itemId === itemId)
}

function getTranslation(mark: Mark) {
  const matrix = mark.matrix as number[] | undefined
  return {
    x: matrix ? matrix[6] || 0 : 0,
    y: matrix ? matrix[7] || 0 : 0,
  }
}

function getPersonIconPrimitiveBounds(icon: Extract<Mark, { type: 'symbol' }>) {
  const groupTranslation = getTranslation(icon.mark)
  const bounds = {
    left: Infinity,
    right: -Infinity,
    top: Infinity,
    bottom: -Infinity,
  }

  function includePoint(x: number, y: number) {
    bounds.left = Math.min(bounds.left, x)
    bounds.right = Math.max(bounds.right, x)
    bounds.top = Math.min(bounds.top, y)
    bounds.bottom = Math.max(bounds.bottom, y)
  }

  icon.mark.children.forEach(child => {
    const childTranslation = getTranslation(child)
    const offsetX = groupTranslation.x + childTranslation.x
    const offsetY = groupTranslation.y + childTranslation.y
    if (child.type === 'circle') {
      includePoint(child.attrs.x + offsetX - child.attrs.r, child.attrs.y + offsetY - child.attrs.r)
      includePoint(child.attrs.x + offsetX + child.attrs.r, child.attrs.y + offsetY + child.attrs.r)
    } else if (child.type === 'path' && Array.isArray(child.attrs.path)) {
      let currentX = 0
      let currentY = 0
      child.attrs.path.forEach(command => {
        if (command[0] === 'M' || command[0] === 'L') {
          currentX = command[1] as number
          currentY = command[2] as number
          includePoint(currentX + offsetX, currentY + offsetY)
        } else if (command[0] === 'l') {
          currentX += command[1] as number
          currentY += command[2] as number
          includePoint(currentX + offsetX, currentY + offsetY)
        }
      })
    }
  })

  return bounds
}

describe('c4 artist', () => {
  beforeAll(() => {
    prepareDiagramConfig()
    diagramRegistry.registerDiagram('c4Diagram', c4Diagram)
  })

  it('renders a context diagram', () => {
    const code = `
C4Context
title: System Context
Person(customer, "Customer", "Uses online banking")
System(banking, "Internet Banking System", "Allows customers to view accounts")
System_Ext(email, "E-mail System", "Sends notifications")
Rel(customer, banking, "Uses", "HTTPS")
Rel(banking, email, "Sends e-mail", "SMTP")
`

    expect(stripDrawResultForSnapshot(testDraw(code))).toMatchSnapshot()
  })

  it('renders a container diagram with a system boundary and database', () => {
    const code = `
C4Container
System_Boundary(banking, "Internet Banking System") {
  Container(web, "Web Application", "React", "Delivers SPA")
  Container(api, "API Application", "Spring Boot", "Handles business requests")
  ContainerDb(db, "Database", "PostgreSQL", "Stores account data")
}
Person(customer, "Customer")
Rel(customer, web, "Uses", "HTTPS")
Rel(web, api, "Calls", "JSON/HTTPS")
Rel(api, db, "Reads/Writes", "JDBC")
`

    expect(stripDrawResultForSnapshot(testDraw(code))).toMatchSnapshot()
  })

  it('renders child-to-boundary relationships without sending them through dagre', () => {
    const code = `
C4Container
System_Boundary(banking, "Internet Banking System") {
  Container(api, "API Application", "Spring Boot")
}
Rel(api, banking, "Runs inside")
`

    const result = testDraw(code)
    const rootMark = result.graphicIR.mark as Group
    const relationship = rootMark.children.find(
      (child): child is Group => child.type === 'group' && child.itemId === 'c4-rel-0',
    )!
    const line = relationship.children.find(child => child.class === 'c4__rel-line')!

    expect(line.attrs.path.length).toBeGreaterThan(0)
    expect(stripDrawResultForSnapshot(result)).toMatchSnapshot()
  })

  it('renders bidirectional and direction-hinted relationships', () => {
    const code = `
C4Component
Container_Boundary(api, "API Application") {
  Component(controller, "Account Controller", "TypeScript")
  Component(service, "Account Service", "TypeScript")
}
BiRel(controller, service, "Calls")
Rel_R(service, controller, "Returns")
`

    const result = testDraw(code)
    expect(result).toBeTruthy()

    const rootMark = result.graphicIR.mark as Group
    const relationshipLines = rootMark.children
      .filter((child): child is Group => child.type === 'group')
      .flatMap(group => group.children || [])
      .filter(child => child.class === 'c4__rel-line')

    expect(relationshipLines.length).toBeGreaterThanOrEqual(2)
    expect(stripDrawResultForSnapshot(result)).toMatchSnapshot()
  })

  it('renders dynamic relationship indexes in labels', () => {
    const code = `
C4Dynamic
Container(web, "Web", "React")
Container(api, "API", "Node.js")
RelIndex(1, web, api, "Submits request", "JSON/HTTPS")
`

    const result = testDraw(code)
    const rootMark = result.graphicIR.mark as Group
    const relationship = findC4ElementGroup(rootMark, 'c4-rel-0')
    const label = relationship.children.find(child => child.type === 'text' && child.class === 'c4__rel-label')!

    expect(label.attrs.text).toBe('1. Submits request [JSON/HTTPS]')
  })

  it('applies relationship tag styles from RelIndex fifth positional argument', () => {
    const code = `
C4Dynamic
AddRelTag("async", $lineColor="#0066cc", $lineStyle=DashedLine())
Container(web, "Web", "React")
Container(api, "API", "Node.js")
RelIndex(1, web, api, "Calls", "async")
`

    const result = testDraw(code)
    const rootMark = result.graphicIR.mark as Group
    const relationship = findC4ElementGroup(rootMark, 'c4-rel-0')
    const line = relationship.children.find(child => child.class === 'c4__rel-line')!

    expect(line.attrs.stroke).toBe('#0066cc')
    expect(line.attrs.lineDash).toEqual([6, 4])
  })

  it('renders deployment nodes as nested boundaries', () => {
    const code = `
C4Deployment
Deployment_Node(region, "AWS Region", "us-east-1") {
  Node(cluster, "EKS Cluster", "Kubernetes") {
    Container(api, "API", "Node.js")
  }
}
Rel(api, region, "Runs in")
`

    const result = testDraw(code)
    const rootMark = result.graphicIR.mark as Group
    const region = findC4ElementGroup(rootMark, 'c4-boundary-region')
    const cluster = findC4ElementGroup(rootMark, 'c4-boundary-cluster')
    const regionLabel = region.children.find(child => child.type === 'text' && child.class === 'c4__boundary-label')!
    const clusterLabel = cluster.children.find(child => child.type === 'text' && child.class === 'c4__boundary-label')!

    expect(region.class).toContain('c4__boundary--deploymentNode')
    expect(cluster.class).toContain('c4__boundary--deploymentNode')
    expect(regionLabel.attrs.text).toBe('AWS Region - us-east-1')
    expect(clusterLabel.attrs.text).toBe('EKS Cluster - Kubernetes')
    expect(findC4GroupIndex(rootMark, 'c4-boundary-region')).toBeLessThan(
      findC4GroupIndex(rootMark, 'c4-boundary-cluster'),
    )
    expect(findC4GroupIndex(rootMark, 'c4-boundary-cluster')).toBeLessThan(findC4GroupIndex(rootMark, 'c4-element-api'))
  })

  it('renders shared dynamic and deployment examples', () => {
    expect(testDraw(EXAMPLES.c4Dynamic.code).graphicIR.mark).toBeTruthy()
    expect(testDraw(EXAMPLES.c4Deployment.code).graphicIR.mark).toBeTruthy()
    expect(testDraw(EXAMPLES.c4Styled.code).graphicIR.mark).toBeTruthy()
  })

  it('applies tag declarations to elements and relationships and renders a generated legend', () => {
    const code = `
C4Container
AddElementTag("critical", $bgColor="#ffdddd", $fontColor="#550000", $borderColor="#cc0000", $shape=RoundedBoxShape(), $legendText="Critical element")
AddElementTag("unused", $bgColor="#eeeeee", $legendText="Unused element")
AddRelTag("async", $textColor="#003366", $lineColor="#0066cc", $lineStyle=DashedLine(), $legendText="Async call")
Container(api, "API", "Node.js", $tags="critical")
ContainerQueue(events, "Events", "Kafka")
Rel(api, events, "Publishes", $tags="async")
SHOW_LEGEND()
`

    const result = testDraw(code)
    const rootMark = result.graphicIR.mark as Group
    const apiGroup = findC4ElementGroup(rootMark, 'c4-element-api')
    const apiRect = apiGroup.children.find(child => child.class === 'c4__element-rect')!
    const apiTexts = apiGroup.children.filter(child => child.type === 'text')
    const relationship = findC4ElementGroup(rootMark, 'c4-rel-0')
    const relationshipLine = relationship.children.find(child => child.class === 'c4__rel-line')!
    const relationshipLabel = relationship.children.find(
      child => child.type === 'text' && child.class === 'c4__rel-label',
    )!
    const legend = rootMark.children.find(
      (child): child is Group => child.type === 'group' && child.class === 'c4__legend',
    )!
    const legendTexts = legend.children.filter(child => child.type === 'text').map(child => child.attrs.text)

    expect(apiRect.attrs.fill).toBe('#ffdddd')
    expect(apiRect.attrs.stroke).toBe('#cc0000')
    expect(apiRect.attrs.radius).toBeGreaterThan(4)
    expect(apiTexts.every(text => text.attrs.fill === '#550000')).toBe(true)
    expect(relationshipLine.attrs.stroke).toBe('#0066cc')
    expect(relationshipLine.attrs.lineDash).toEqual([6, 4])
    expect(relationshipLabel.attrs.fill).toBe('#003366')
    expect(legendTexts).toContain('Legend')
    expect(legendTexts).toContain('Critical element')
    expect(legendTexts).toContain('Async call')
    expect(legendTexts).not.toContain('Unused element')
  })

  it('applies UpdateElementStyle after tag styles', () => {
    const code = `
C4Container
AddElementTag("critical", $bgColor="#ffdddd", $fontColor="#550000")
Container(api, "API", "", $tags="critical")
UpdateElementStyle(api, $bgColor="#ddeeff", $fontColor="#001144", $borderColor="#003399", $shape=RoundedBoxShape(), $techn="Express")
`

    const result = testDraw(code)
    const rootMark = result.graphicIR.mark as Group
    const apiGroup = findC4ElementGroup(rootMark, 'c4-element-api')
    const rect = apiGroup.children.find(child => child.class === 'c4__element-rect')!
    const texts = apiGroup.children.filter(child => child.type === 'text')

    expect(rect.attrs.fill).toBe('#ddeeff')
    expect(rect.attrs.stroke).toBe('#003399')
    expect(rect.attrs.radius).toBeGreaterThan(4)
    expect(texts.every(text => text.attrs.fill === '#001144')).toBe(true)
    expect(texts.map(text => text.attrs.text)).toContain('[Express]')
  })

  it('applies UpdateRelStyle to matching relationships', () => {
    const code = `
C4Container
Container(api, "API", "Node.js")
Container(db, "DB", "PostgreSQL")
Rel(api, db, "Reads")
UpdateRelStyle(api, db, $textColor="#003366", $lineColor="#0066cc")
`

    const result = testDraw(code)
    const rootMark = result.graphicIR.mark as Group
    const relationship = findC4ElementGroup(rootMark, 'c4-rel-0')
    const line = relationship.children.find(child => child.class === 'c4__rel-line')!
    const label = relationship.children.find(child => child.type === 'text' && child.class === 'c4__rel-label')!

    expect(line.attrs.stroke).toBe('#0066cc')
    expect(label.attrs.fill).toBe('#003366')
  })

  it('vertically centers legend swatches with their labels', () => {
    const code = `
C4Container
AddElementTag("critical", $bgColor="#ffdddd", $fontColor="#550000", $borderColor="#cc0000", $shape=RoundedBoxShape(), $legendText="Critical element")
Person(customer, "Customer", "Uses online banking")
Container(api, "API Application", "Spring Boot", "Handles business requests", $tags="critical")
Rel(customer, api, "Uses", "HTTPS")
SHOW_LEGEND()
`

    const result = testDraw(code)
    const rootMark = result.graphicIR.mark as Group
    const legend = rootMark.children.find(
      (child): child is Group => child.type === 'group' && child.class === 'c4__legend',
    )!
    const label = legend.children.find(
      child => child.type === 'text' && child.class === 'c4__legend-label' && child.attrs.text === 'Critical element',
    )!
    const swatch = legend.children.find(child => child.type === 'rect' && child.class === 'c4__legend-element-swatch')!

    expect(label.attrs.textBaseline).toBe('middle')
    expect(label.attrs.y).toBe(swatch.attrs.y + swatch.attrs.height / 2)
  })

  it('keeps the person icon inside its element box and separates element text rows', () => {
    const code = `
C4Container
Person(customer, "Customer", "A retail banking customer")
System_Ext(email, "E-mail System", "Sends notifications")
`

    const result = testDraw(code)
    const rootMark = result.graphicIR.mark as Group
    const personGroup = findC4ElementGroup(rootMark, 'c4-element-customer')
    const rect = personGroup.children.find(child => child.class === 'c4__element-rect')!
    const icon = personGroup.children.find(
      (child): child is Extract<Mark, { type: 'symbol' }> => child.type === 'symbol',
    )!
    const iconBounds = getPersonIconPrimitiveBounds(icon)

    expect(iconBounds.left).toBeGreaterThanOrEqual(rect.attrs.x)
    expect(iconBounds.top).toBeGreaterThanOrEqual(rect.attrs.y)
    expect(iconBounds.right).toBeLessThanOrEqual(rect.attrs.x + rect.attrs.width)
    expect(iconBounds.bottom).toBeLessThanOrEqual(rect.attrs.y + rect.attrs.height)

    const stereotypeText = personGroup.children.find(
      child => child.type === 'text' && child.attrs.text === '<<person>>',
    )!
    const titleText = personGroup.children.find(child => child.type === 'text' && child.attrs.text === 'Customer')!
    const descriptionText = personGroup.children.find(
      child => child.type === 'text' && child.attrs.text === 'A retail banking customer',
    )!
    const textRows = personGroup.children.filter(child => child.type === 'text')
    expect(textRows.map(text => text.attrs.text)).toEqual(['<<person>>', 'Customer', 'A retail banking customer'])

    expect(stereotypeText.attrs.y).toBeLessThan(titleText.attrs.y)
    expect(stereotypeText.attrs.fontStyle).toBe('italic')

    const titleDims = calculateTextDimensions(titleText.attrs.text, {
      fontFamily: titleText.attrs.fontFamily,
      fontSize: titleText.attrs.fontSize,
      fontStyle: titleText.attrs.fontStyle,
      fontWeight: titleText.attrs.fontWeight,
    })
    const descriptionDims = calculateTextDimensions(descriptionText.attrs.text, {
      fontFamily: descriptionText.attrs.fontFamily,
      fontSize: descriptionText.attrs.fontSize,
      fontStyle: descriptionText.attrs.fontStyle,
      fontWeight: descriptionText.attrs.fontWeight,
    })

    expect(descriptionText.attrs.y - titleText.attrs.y).toBeGreaterThanOrEqual(
      titleDims.height / 2 + descriptionDims.height / 2 + 12,
    )
  })

  it('renders container stereotype, label, technology, and description in mermaid-like order', () => {
    const code = `
C4Container
Container(web, "Web Application", "React", "Delivers the single-page app")
`

    const result = testDraw(code)
    const rootMark = result.graphicIR.mark as Group
    const containerGroup = findC4ElementGroup(rootMark, 'c4-element-web')
    const textRows = containerGroup.children.filter(child => child.type === 'text')
    const stereotypeText = textRows.find(text => text.attrs.text === '<<container>>')!
    const technologyText = textRows.find(text => text.attrs.text === '[React]')!
    const labelText = textRows.find(text => text.attrs.text === 'Web Application')!
    const descriptionText = textRows.find(text => text.attrs.text === 'Delivers the single-page app')!

    expect(textRows.map(text => text.attrs.text)).toEqual([
      '<<container>>',
      'Web Application',
      '[React]',
      'Delivers the single-page app',
    ])
    expect(stereotypeText.attrs.fontStyle).toBe('italic')
    expect(labelText.attrs.fontWeight).toBe('bold')
    expect(technologyText.attrs.fontStyle).toBe('italic')

    const technologyDims = calculateTextDimensions(technologyText.attrs.text, {
      fontFamily: technologyText.attrs.fontFamily,
      fontSize: technologyText.attrs.fontSize,
      fontStyle: technologyText.attrs.fontStyle,
      fontWeight: technologyText.attrs.fontWeight,
    })
    const descriptionDims = calculateTextDimensions(descriptionText.attrs.text, {
      fontFamily: descriptionText.attrs.fontFamily,
      fontSize: descriptionText.attrs.fontSize,
      fontStyle: descriptionText.attrs.fontStyle,
      fontWeight: descriptionText.attrs.fontWeight,
    })

    expect(descriptionText.attrs.y - technologyText.attrs.y).toBeGreaterThanOrEqual(
      technologyDims.height / 2 + descriptionDims.height / 2 + 12,
    )
  })

  it('uses the configured external background for external elements', () => {
    const code = `
C4Context
@config({
  "c4": {
    "externalBackground": "#eeeeee"
  }
})
System(api, "API")
System_Ext(email, "E-mail System")
`

    const result = testDraw(code)
    const rootMark = result.graphicIR.mark as Group
    const systemGroup = findC4ElementGroup(rootMark, 'c4-element-api')
    const externalGroup = findC4ElementGroup(rootMark, 'c4-element-email')
    const systemRect = systemGroup.children.find(child => child.class === 'c4__element-rect')!
    const externalRect = externalGroup.children.find(child => child.class === 'c4__element-rect')!

    expect(externalRect.attrs.fill).toBe('#eeeeee')
    expect(externalRect.attrs.fill).not.toBe(systemRect.attrs.fill)
    expect(externalRect.attrs.lineDash).toEqual([4, 4])
  })

  it('uses the common queue symbol for queue-shaped elements', () => {
    const createSpy = jest.spyOn(symbolRegistry, 'create')
    const code = `
C4Container
ContainerQueue(events, "Events", "Kafka", "Publishes domain events")
`

    testDraw(code)

    expect(createSpy).toHaveBeenCalledWith(
      'queue',
      expect.objectContaining({
        mode: 'icon',
      }),
    )

    createSpy.mockRestore()
  })

  it('lays out elements top-to-bottom by default and still allows left-to-right override', () => {
    const code = `
C4Container
Person(customer, "Customer")
System_Ext(email, "E-mail System")
`

    const defaultResult = testDraw(code)
    const defaultRootMark = defaultResult.graphicIR.mark as Group
    const defaultPerson = findC4ElementGroup(defaultRootMark, 'c4-element-customer')
    const defaultEmail = findC4ElementGroup(defaultRootMark, 'c4-element-email')
    const defaultPersonRect = defaultPerson.children.find(child => child.class === 'c4__element-rect')!
    const defaultEmailRect = defaultEmail.children.find(child => child.class === 'c4__element-rect')!

    expect(Math.abs(defaultEmailRect.attrs.y - defaultPersonRect.attrs.y)).toBeGreaterThan(
      Math.abs(defaultEmailRect.attrs.x - defaultPersonRect.attrs.x),
    )

    const lrResult = testDraw(`
C4Container
@config({
  "c4": {
    "layoutDirection": "LR"
  }
})
Person(customer, "Customer")
System_Ext(email, "E-mail System")
`)
    const lrRootMark = lrResult.graphicIR.mark as Group
    const lrPerson = findC4ElementGroup(lrRootMark, 'c4-element-customer')
    const lrEmail = findC4ElementGroup(lrRootMark, 'c4-element-email')
    const lrPersonRect = lrPerson.children.find(child => child.class === 'c4__element-rect')!
    const lrEmailRect = lrEmail.children.find(child => child.class === 'c4__element-rect')!

    expect(Math.abs(lrEmailRect.attrs.x - lrPersonRect.attrs.x)).toBeGreaterThan(
      Math.abs(lrEmailRect.attrs.y - lrPersonRect.attrs.y),
    )
  })
})
