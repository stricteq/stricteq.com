const click = require('./click')

module.exports = async ({ browser, port }) => {
  await browser.navigateTo(`http://localhost:${port}/`)
  await click(browser, '#account')
  await click(browser, '#connect')
  await click(browser, '=Skip this account form')
}
