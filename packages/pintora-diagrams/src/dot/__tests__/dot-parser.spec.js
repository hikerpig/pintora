import { parse } from '../parser'
import db from '../db'
import { stripStartEmptyLines } from '@pintora/test-shared'

// some test set https://gitlab.com/graphviz/graphviz/-/tree/main/tests/graphs
describe('dot parser', () => {
  afterEach(() => {
    db.clear()
  })

  it('should parse node', () => {
    const example = stripStartEmptyLines(`
dotDiagram

graph ER {
	name [shape=box]; course; student;
}
    `)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log(JSON.stringify(ir, null, 2))
    expect(ir.graph).toMatchSnapshot()
  })

  it('should parse node in shorthand', () => {
    const example = stripStartEmptyLines(`
dotDiagram
graph ER {
	name["a long long name"]
}
    `)
    parse(example)
    const ir = db.getDiagramIR()
    expect(ir.graph).toMatchSnapshot()
  })

  it('should parse edge', () => {
    const example = stripStartEmptyLines(`
  dotDiagram
  graph Test {
    name0 -- course;
    course -- "C-I" [label="n",len=1.00];
  }
      `)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log(JSON.stringify(ir, null, 2))
    expect(ir.graph).toMatchSnapshot()
  })

  it('should parse directed edge', () => {
    const example = stripStartEmptyLines(`
  dotDiagram
  digraph Test {
    a -> b;
  }
      `)
    parse(example)
    const ir = db.getDiagramIR()
    expect(ir.graph).toMatchSnapshot()
  })

  it('should parse attr stmt', () => {
    const example = stripStartEmptyLines(`
  dotDiagram
  graph {
    color=lightgrey;
    node [color=red, fontcolor=blue]
    edge [color=purple, fontcolor=green]

    subgraph sub {
      label = "process";
    }
  }
      `)
    parse(example)
    const ir = db.getDiagramIR()
    expect(ir.graph).toMatchSnapshot()
  })

  it('should parse subgraph', () => {
    const example = stripStartEmptyLines(`
  dotDiagram
  graph Test {
    subgraph S1 {
      n1;
    }
    n2;

    n1 -- n2;
  }
      `)
    parse(example)
    const ir = db.getDiagramIR()
    expect(ir.graph).toMatchSnapshot()
  })

  it('should parse dot comment', () => {
    const example = stripStartEmptyLines(`
  dotDiagram
  // comment 1
  graph Test {
    // comment 2
    some_node
    %% pintora comment 1
    /**
     * block - comment
     */
  }
  %% pintora comment 2
      `)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log(JSON.stringify(ir, null, 2))
    expect(ir.graph).toMatchSnapshot()
  })
})
