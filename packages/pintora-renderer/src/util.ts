export class Stack<T> {
  protected list: T[] = []
  top() {
    return this.list[this.list.length - 1]
  }
  push(v: T) {
    this.list.push(v)
  }
  pop() {
    return this.list.pop()
  }
  clear() {
    this.list = []
  }
}
