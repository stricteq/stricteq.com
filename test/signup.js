import addValue from './add-value.js'
import assert from 'assert'
import click from './click.js'
import testEvents from '../test-events.js'

export default async ({
  name,
  location,
  urls,
  handle,
  password,
  email,
  browser,
  port
}, callback) => {
  assert(browser)
  assert(Number.isSafeInteger(port))
  assert(typeof name === 'string')
  assert(typeof location === 'string')
  assert(typeof handle === 'string')
  assert(typeof password === 'string')
  assert(typeof email === 'string')
  if (!urls) {
    urls = [
      `https://github.com/${handle}`,
      `https://twitter.com/${handle}`,
      `https://twitch.tv/${handle}`
    ]
  }
  await browser.navigateTo('http://localhost:' + port)
  await click(browser, 'a=Sign Up')
  await addValue(browser, '#signupForm input[name="name"]', name)
  await addValue(browser, '#signupForm input[name="location"]', location)
  await addValue(browser, '#signupForm input[name="email"]', email)
  await addValue(browser, '#signupForm input[name="handle"]', handle)
  await addValue(browser, '#signupForm input[name="password"]', password)
  await addValue(browser, '#signupForm input[name="repeat"]', password)
  await Promise.all(
    urls.map((url, index) => addValue(browser, `(//form[@id="signupForm"]//input[@name="urls"])[${index + 1}]`, url))
  )
  let url
  await Promise.all([
    new Promise((resolve, reject) => testEvents.once('sent', options => {
      if (!options.subject.includes('Confirm')) {
        return reject(new Error('no confirmation e-mail'))
      }
      url = /<(http:\/\/[^ ]+)>/.exec(options.text)[1]
      resolve()
    })),
    click(browser, '#signupForm button[type="submit"]')
  ])
  await browser.navigateTo(url)
}
