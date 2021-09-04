import { KeyBinding } from '@codemirror/view'
import { indentMore, indentLess } from "@codemirror/commands"

const getSoftTabChars = (tabSize: number) => {
  const arr = []
  for (let i = tabSize; i > 0; i--) {
    arr.push(' ')
  }
  return arr.join('')
}

export const tabKeymaps: KeyBinding[] = [{
  key: 'Tab',
  run(view) {
    const { dispatch, state } = view
    const { from, to } = state.selection.main
    const hasCrossRowSelection = state.sliceDoc(from, to).includes(state.lineBreak)
    if (hasCrossRowSelection) {
      indentMore(view)
    } else {
      dispatch(state.update(state.replaceSelection(getSoftTabChars(state.tabSize)), { scrollIntoView: true, userEvent: "input" }));
    }
    return true;
  }
}, {
  key: 'Shift-Tab',
  run(view) {
    return indentLess(view)
  }
}]
