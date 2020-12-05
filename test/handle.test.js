import http from 'http'
import interactive from './interactive.js'
import server from './server.js'
import signup from './signup.js'
import tap from 'tap'
import testEvents from '../test-events.js'

const path = '/handle'

const name = 'Ana Tester'
const location = 'US-CA'
const handle = 'ana'
const password = 'ana password'
const email = 'ana@example.com'

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

interactive('discover handle', async ({ page, port, test }) => {
  await signup({ page, port, name, location, handle, password, email })
  await Promise.all([
    new Promise((resolve, reject) => {
      testEvents.once('sent', options => {
        test.equal(options.to, email, 'sent mail')
        test.assert(options.text.includes(handle), 'mailed handle')
        resolve()
      })
    }),
    (async () => {
      await page.goto('http://localhost:' + port)
      await page.click('#login')
      await page.click('"Forgot Handle"')
      await page.fill('#handleForm input[name="email"]', email)
      await page.click('#handleForm button[type="submit"]')
    })()
  ])
})
