import { stripStartEmptyLines } from '@pintora/test-shared'
import { makeSnapshotCases } from '../test-utils/render'

describe('Class Diagram', () => {
  makeSnapshotCases([
    {
      description: 'Should render class diagram example',
      code: stripStartEmptyLines(`
      classDiagram
      class Fruit {
        float sweetness
        -float age

        float getAge()
      }

      class Apple {
      }

      %% There are so many kind of fruits
      Fruit <|-- Apple
      Fruit <|-- Kiwi
      Fruit <|-- Banana

      Container "1" *-- "many" Fruit : holds
`),
    },
  ])
})
