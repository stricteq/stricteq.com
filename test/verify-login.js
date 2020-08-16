const assert = require('assert')
const click = require('./click')

module.exports = options => {
  assert(options.browser)
  assert(options.test)
  assert(Number.isSafeInteger(options.port))
  assert(typeof options.handle === 'string')
  assert(typeof options.email === 'string')
  const browser = options.browser
  const test = options.test
  const port = options.port
  const handle = options.handle
  const email = options.email
  return browser.navigateTo('http://localhost:' + port)
    .then(() => browser.$('#account'))
    .then(a => a.waitForExist())
    .then(() => click(browser, '#account'))
    .then(() => browser.$('.handle'))
    .then(element => element.getText())
    .then(text => test.equal(text, handle, '/account shows handle'))
    .then(() => browser.$('.email'))
    .then(element => element.getText())
    .then(text => test.equal(text, email, '/account shows e-mail'))
}
