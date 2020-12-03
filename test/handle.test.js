import addValue from './add-value.js'
import click from './click.js'
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

interactive('discover handle', async ({ browser, port, test }) => {
  await signup({ browser, port, name, location, handle, password, email })
  await Promise.all([
    new Promise((resolve, reject) => {
      testEvents.once('sent', options => {
        test.equal(options.to, email, 'sent mail')
        test.assert(options.text.includes(handle), 'mailed handle')
        resolve()
      })
    }),
    (async () => {
      await browser.navigateTo('http://localhost:' + port)
      await click(browser, '#login')
      await click(browser, 'a=Forgot Handle')
      await addValue(browser, '#handleForm input[name="email"]', email)
      await click(browser, '#handleForm button[type="submit"]')
    })()
  ])
})
