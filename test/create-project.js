const addValue = require('./add-value')
const assert = require('assert')
const click = require('./click')

module.exports = ({
  browser,
  port,
  project,
  description = 'a simple test project',
  language = 'C',
  urls,
  price,
  category = 'library'
}, callback) => {
  assert(browser)
  assert(Number.isSafeInteger(port))
  assert(typeof project === 'string')
  assert(Number.isSafeInteger(price))
  assert(typeof category === 'string')
  if (!urls) {
    urls = [
      `https://github.com/example/${project}`,
      `http://example.com/${project}`
    ]
  }
  return browser.navigateTo('http://localhost:' + port)
    .then(() => click(browser, '#account'))
    .then(() => click(browser, '=Create Project'))
    .then(() => addValue(browser, '#createForm input[name="project"]', project))
    .then(() => addValue(browser, '#createForm input[name="description"]', description))
    .then(() => Promise.all(
      urls.map((url, index) => addValue(browser, `(//form[@id="createForm"]//input[@name="urls"])[${index + 1}]`, url))
    ))
    .then(() => addValue(browser, '#createForm input[name="price"]', price))
    .then(() => browser.$('#createForm select[name="language"]'))
    .then(input => input.selectByVisibleText(language))
    .then(() => browser.$('#createForm select[name="category"]'))
    .then(input => input.selectByVisibleText(category))
    .then(() => click(browser, '#createForm button[type="submit"]'))
    .catch(callback)
}
