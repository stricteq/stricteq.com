import click from './click.js'
import testEvents from '../test-events.js'

export default async ({ browser, port }) => {
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
