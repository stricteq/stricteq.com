const click = require('./click')
const testEvents = require('../test-events')

module.exports = async ({ browser, port }) => {
  await browser.navigateTo(`http://localhost:${port}/`)
  await click(browser, '#account')
  await click(browser, '#connect')
  await Promise.all([
    new Promise((resolve, reject) => {
      testEvents.once('connected', () => resolve())
    }),
    await click(browser, '=Skip this account form')
  ])
}
