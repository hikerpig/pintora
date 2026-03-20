import * as pintora from '@pintora/core'
import { testDraw, prepareDiagramConfig, stripDrawResultForSnapshot } from '../../__tests__/test-util'
import { useCaseDiagram } from '../index'

describe('usecase-artist', () => {
  beforeAll(() => {
    prepareDiagramConfig()
    pintora.diagramRegistry.registerDiagram('useCaseDiagram', useCaseDiagram)
  })

  it('will not throw error for basic usecase diagram', () => {
    const code = `
useCaseDiagram
actor User as "普通用户"
actor Admin as "管理员"
(Login) as "用户登录"
(Logout) as "用户退出"
(ManageUsers) as "管理用户"
User --> Login
User --> Logout
Admin --> Login
Admin --> ManageUsers
`
    expect(testDraw(code).graphicIR).toBeTruthy()
  })

  it('will draw usecase diagram with title', () => {
    const code = `
useCaseDiagram
title: Library Management System
actor User as "用户"
actor Librarian as "图书管理员"
(Borrow) as borrow
(Return) as returnBook
(ManageCatalog) as manageCatalog
User --> borrow
User --> returnBook
Librarian --> borrow
Librarian --> returnBook
Librarian --> manageCatalog
`
    expect(stripDrawResultForSnapshot(testDraw(code))).toMatchSnapshot()
  })

  it('will draw simple usecase diagram', () => {
    const code = `
useCaseDiagram
actor Customer as "顾客"
actor Staff as "员工"
(PlaceOrder) as order
(Pay) as pay
Customer --> order
Customer --> pay
Staff --> order
`
    expect(stripDrawResultForSnapshot(testDraw(code))).toMatchSnapshot()
  })
})
