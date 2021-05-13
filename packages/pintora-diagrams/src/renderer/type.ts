// Graphics
export interface Mark<A=any> {
  type: 'rect' | 'circle' | 'group',
  attr: A
  style: any
}

export interface Group extends Mark {
  type: 'group'
  children: Mark[]
}

export interface Figure {
  mark: Mark
}