const assert = require('assert')

module.exports = options => {
  assert(options.browser)
  assert(options.test)
  assert(Number.isSafeInteger(options.port))
  assert(typeof options.handle === 'string')
  const browser = options.browser
  const test = options.test
  const port = options.port
  const handle = options.handle
  return browser.navigateTo('http://localhost:' + port)
    .then(() => browser.$('#profile'))
    .then(a => a.waitForExist())
    .then(() => browser.$('#profile'))
    .then(a => a.getText())
    .then(text => test.equal(text, handle, 'shows handle'))
}
