import http from 'http'
import interactive from './interactive.js'
import server from './server.js'
import signup from './signup.js'
import tap from 'tap'
import testEvents from '../../test-events.js'
import verifyLogIn from './verify-login.js'

const path = '/reset'

tap.test('GET ' + path, test => {
  server((port, done) => {
    http.request({ path, port })
      .once('response', response => {
        test.equal(response.statusCode, 200, '200')
        test.end()
        done()
      })
      .end()
  })
})

interactive('reset password', async ({ page, port, test }) => {
  const name = 'Ana Tester'
  const location = 'US-CA'
  const handle = 'tester'
  const password = 'test password'
  const email = 'tester@example.com'
  await signup({ page, port, name, location, handle, password, email })
  await page.goto('http://localhost:' + port)
  await page.click('#login')
  await page.click('"Reset Password"')
  await page.fill('#resetForm input[name="handle"]', handle)
  let url
  await Promise.all([
    new Promise((resolve, reject) => {
      testEvents.once('sent', options => {
        test.equal(options.to, email, 'sent mail')
        test.assert(options.subject.includes('Reset'), 'reset')
        url = /<(http:\/\/[^ ]+)>/.exec(options.text)[1]
        resolve()
      })
    }),
    page.click('#resetForm button[type="submit"]')
  ])
  await page.goto(url)
  // Fill reset form.
  await page.fill('#passwordForm input[name="password"]', password)
  await page.fill('#passwordForm input[name="repeat"]', password)
  await page.click('#passwordForm button[type="submit"]')
  // Navigate to log-in form.
  await page.click('#login')
  // Fill log-in form.
  await page.fill('#loginForm input[name="handle"]', handle)
  await page.fill('#loginForm input[name="password"]', password)
  await page.click('#loginForm button[type="submit"]')
  await verifyLogIn({ page, port, test, handle, email })
})
