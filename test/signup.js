import assert from 'assert'
import testEvents from '../test-events.js'

export default async ({
  name,
  location,
  urls,
  handle,
  password,
  email,
  page,
  port
}) => {
  assert(page)
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
  await page.goto('http://localhost:' + port)
  await page.click('text="Sign Up"')
  const signupForm = '#signupForm'
  await page.fill(`${signupForm} input[name="name"]`, name)
  await page.fill(`${signupForm} input[name="location"]`, location)
  await page.fill(`${signupForm} input[name="email"]`, email)
  await page.fill(`${signupForm} input[name="handle"]`, handle)
  await page.fill(`${signupForm} input[name="password"]`, password)
  await page.fill(`${signupForm} input[name="repeat"]`, password)
  await Promise.all(
    urls.map((url, index) => page.fill(`(//form[@id="signupForm"]//input[@name="urls"])[${index + 1}]`, url))
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
    page.click(`${signupForm} button[type="submit"]`)
  ])
  await page.goto(url)
}
