const addValue = require('./add-value')
const assert = require('assert')
const click = require('./click')

module.exports = ({
  browser,
  port,
  project,
  url,
  price,
  category = 'library'
}, callback) => {
  assert(browser)
  assert(Number.isSafeInteger(port))
  assert(typeof project === 'string')
  assert(typeof url === 'string')
  assert(Number.isSafeInteger(price))
  assert(typeof category === 'string')
  return browser.navigateTo('http://localhost:' + port)
    .then(() => click(browser, '=Account'))
    .then(() => click(browser, '=Create Project'))
    .then(() => addValue(browser, '#createForm input[name="project"]', project))
    .then(() => addValue(browser, '#createForm input[name="url"]', url))
    .then(() => addValue(browser, '#createForm input[name="price"]', price))
    .then(() => browser.$('#createForm select[name="category"]'))
    .then(input => input.selectByVisibleText(category))
    .then(() => click(browser, '#createForm button[type="submit"]'))
    .catch(callback)
}
