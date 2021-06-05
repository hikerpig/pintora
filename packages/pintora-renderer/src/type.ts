export interface IRenderer {
  render(): void
  setContainer(container: any): void
  getRootElement(): Element;
}