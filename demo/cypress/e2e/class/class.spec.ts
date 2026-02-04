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
    {
      // issue #394
      description: 'will draw multiple edges between two classes without overlapping',
      code: stripStartEmptyLines(`
      classDiagram
        class Cancion {
          nombre
        }

        class Album

        Cancion "1..*" -- "1..1" Album : a
        Cancion "1..*" -- "1..*" Album : b
`),
    },
  ])
})
