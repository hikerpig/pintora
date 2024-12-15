type PreprocessorState = {
  preStartLine: number | null
  preEndLine: number | null
  isInPre: boolean
  hasPreBlock: boolean
}

/**
 * This class is used to pre-process the input text.
 *
 * It detects a "pre" block in the input text, which is a block of text
 * that is surrounded by `@pre` and `@endpre` directive. The content of
 * this block is extracted and returned as a separate field, and the
 * rest of the input text is returned as another field.
 *
 * The pre block is used to pass additional information to the diagram,
 * such as common params for styling
 */
export class PreprocessExtractor {
  parse(text: string) {
    const lines = text.split('\n')
    const state: PreprocessorState = {
      preStartLine: null,
      preEndLine: null,
      isInPre: false,
      hasPreBlock: false,
    }

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim()
      if (state.isInPre) {
        if (trimmed.startsWith('@endpre')) {
          state.isInPre = false
          state.hasPreBlock = true
          state.preEndLine = i
        }
      } else {
        if (trimmed.startsWith('@pre')) {
          state.isInPre = true
          state.preStartLine = i
        }
      }
    }

    let preContent = null
    let content = text
    if (state.hasPreBlock && state.preEndLine) {
      preContent = lines.slice(state.preStartLine! + 1, state.preEndLine).join('\n')
      content = lines.slice(state.preEndLine + 1).join('\n')
    }
    return {
      hasPreBlock: state.hasPreBlock,
      preContent,
      content,
    }
  }
}

export const preprocessExtractor = new PreprocessExtractor()
