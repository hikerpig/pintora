export default (function adModule() {
  return {
    onRouteUpdate({ location }) {
      if (typeof _carbonads !== 'undefined') {
        _carbonads.refresh()
      }
    },
  }
})()
