const http = require('http')
const mail = require('../mail')
const server = require('./server')
const signup = require('./signup')
const tape = require('tape')
const verifyLogIn = require('./verify-login')
const webdriver = require('./webdriver')

const path = '/reset'

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

tape('reset password', test => {
  const name = 'Ana Tester'
  const location = 'US-CA'
  const handle = 'tester'
  const password = 'test password'
  const email = 'tester@example.com'
  server((port, done) => {
    (async () => {
      const browser = await webdriver()
      await new Promise((resolve, reject) => signup({
        browser, port, name, location, handle, password, email
      }, error => {
        if (error) reject(error)
        resolve()
      }))
      await browser.navigateTo('http://localhost:' + port)
      const loginButton = await browser.$('#login')
      await loginButton.click()
      const resetButton = await browser.$('a=Reset Password')
      await resetButton.click()
      const handleInput = await browser.$('#resetForm input[name="handle"]')
      await handleInput.addValue(handle)
      let url
      await Promise.all([
        new Promise((resolve, reject) => {
          mail.events.once('sent', options => {
            test.equal(options.to, email, 'sent mail')
            test.assert(options.subject.includes('Reset'), 'reset')
            url = /<(http:\/\/[^ ]+)>/.exec(options.text)[1]
            resolve()
          })
        }),
        (async () => {
          const submitReset = await browser.$('#resetForm button[type="submit"]')
          await submitReset.click()
        })()
      ])
      await browser.navigateTo(url)
      // Fill reset form.
      const passwordInput = await browser.$('#passwordForm input[name="password"]')
      await passwordInput.addValue(password)
      const repeatInput = await browser.$('#passwordForm input[name="repeat"]')
      await repeatInput.addValue(password)
      const submitButton = await browser.$('#passwordForm button[type="submit"]')
      await submitButton.click()
      // Navigate to log-in form.
      const loginButtonAgain = await browser.$('#login')
      await loginButtonAgain.click()
      // Fill log-in form.
      const loginHandleInput = await browser.$('#loginForm input[name="handle"]')
      await loginHandleInput.addValue(handle)
      const loginPasswordInput = await browser.$('#loginForm input[name="password"]')
      await loginPasswordInput.addValue(password)
      const loginSubmitButton = await browser.$('#loginForm button[type="submit"]')
      await loginSubmitButton.click()
      await verifyLogIn({ browser, port, test, handle, email })
    })().finally(() => {
      test.end()
      done()
    })
  })
})
