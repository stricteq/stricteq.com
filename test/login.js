import addValue from './add-value.js'
import assert from 'assert'
import click from './click.js'

export default (options, callback) => {
  assert(options.browser)
  assert(Number.isSafeInteger(options.port))
  assert(typeof options.handle === 'string')
  assert(typeof options.password === 'string')
  const browser = options.browser
  const port = options.port
  const handle = options.handle
  const password = options.password
  return browser.navigateTo('http://localhost:' + port)
    .then(() => click(browser, '#login'))
    .then(() => addValue(browser, '#loginForm input[name="handle"]', handle))
    .then(() => addValue(browser, '#loginForm input[name="password"]', password))
    .then(() => click(browser, '#loginForm button[type="submit"]'))
    .catch(callback)
}
