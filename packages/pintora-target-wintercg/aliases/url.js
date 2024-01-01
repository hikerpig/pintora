const URL = require('url')

module.exports = {
  ...URL,
  fileURLToPath(s) {
    return s || ''
  },
}
