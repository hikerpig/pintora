import { genParserWithRules } from '../util/parser-util'
import db from './db'
import grammar from './parser/useCaseDiagram'

export const parse = genParserWithRules(grammar, {
  dedupeAmbigousResults: true,
  postProcess(results) {
    // 扁平化结果数组（处理系统边界语句返回的数组）
    const flatResults: any[] = []
    const flatten = (arr: any[]) => {
      arr.forEach(item => {
        if (Array.isArray(item)) {
          flatten(item)
        } else {
          flatResults.push(item)
        }
      })
    }
    flatten(results)

    // 基础校验：避免重名的 actor 和 usecase
    const seenActors = new Set<string>()
    const seenUseCases = new Set<string>()

    const validatedResults = []
    for (const result of flatResults) {
      if (result) {
        if (result.type === 'addActor') {
          if (seenActors.has(result.name)) {
            console.warn(`Warning: Actor "${result.name}" is defined more than once`)
          } else {
            seenActors.add(result.name)
            validatedResults.push(result)
          }
        } else if (result.type === 'addUseCase') {
          if (seenUseCases.has(result.name)) {
            console.warn(`Warning: UseCase "${result.name}" is defined more than once`)
          } else {
            seenUseCases.add(result.name)
            validatedResults.push(result)
          }
        } else {
          validatedResults.push(result)
        }
      }
    }

    db.apply(validatedResults)
    return validatedResults
  },
})
