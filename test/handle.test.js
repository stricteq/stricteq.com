const http = require('http')
const mail = require('../mail').events
const server = require('./server')
const signup = require('./signup')
const tape = require('tape')
const webdriver = require('./webdriver')

const path = '/handle'

const name = 'Ana Tester'
const location = 'US-CA'
const handle = 'ana'
const password = 'ana password'
const email = 'ana@example.com'

tape('GET ' + path, test => {
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

tape('discover handle', test => {
  server((port, done) => {
    (async () => {
      const browser = await webdriver()
      await new Promise((resolve, reject) => signup({
        browser, port, name, location, handle, password, email
      }, error => {
        if (error) reject(error)
        resolve()
      }))
      await Promise.all([
        new Promise((resolve, reject) => {
          mail.once('sent', options => {
            test.equal(options.to, email, 'sent mail')
            test.assert(options.text.includes(handle), 'mailed handle')
            resolve()
          })
        }),
        (async () => {
          await browser.navigateTo('http://localhost:' + port)
          const loginLink = await browser.$('#login')
          await loginLink.click()
          const forgotLink = await browser.$('a=Forgot Handle')
          await forgotLink.click()
          const emailInput = await browser.$('#handleForm input[name="email"]')
          await emailInput.addValue(email)
          const submitButton = await browser.$('#handleForm button[type="submit"]')
          await submitButton.click()
        })()
      ])
    })().finally(() => {
      test.end()
      done()
    })
  })
})
