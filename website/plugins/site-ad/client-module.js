export default (function adModule() {
  return {
    onRouteUpdate() {
      if (typeof _carbonads !== 'undefined') {
        const ele = document.getElementById('carbonads')
        if (ele) {
          ele.parentElement.removeChild(ele)
          _carbonads.refresh()
        }
      }
    },
  }
})()
