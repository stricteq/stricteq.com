import testEvents from '../../test-events.js'
import timeout from './timeout.js'

export default async ({ page, port }) => {
  await page.goto(`http://localhost:${port}/`)
  await page.click('#account')
  await page.click('#connect')
  await timeout(1000)
  await Promise.all([
    new Promise((resolve, reject) => {
      testEvents.once('connected', () => resolve())
    }),
    page.click('#skip-account-app')
  ])
}
