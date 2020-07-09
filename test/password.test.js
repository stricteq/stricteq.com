const login = require('./login')
const logout = require('./logout')
const mail = require('../mail').events
const server = require('./server')
const signup = require('./signup')
const tape = require('tape')
const verifyLogIn = require('./verify-login')
const webdriver = require('./webdriver')

tape('change password', test => {
  const name = 'Ana Tester'
  const location = 'US-CA'
  const handle = 'tester'
  const oldPassword = 'old password'
  const newPassword = 'new password'
  const email = 'tester@example.com'
  server((port, done) => {
    (async () => {
      const browser = await webdriver()
      await new Promise((resolve, reject) => signup({
        browser, port, name, location, handle, password: oldPassword, email
      }, error => {
        if (error) reject(error)
        resolve()
      }))
      await browser.navigateTo('http://localhost:' + port)
      await login({ browser, port, handle, password: oldPassword })
      // Navigate to password-change page.
      const accountButton = await browser.$('a=Account')
      await accountButton.click()
      const changeButton = await browser.$('a=Change Password')
      await changeButton.click()
      // Submit password-change form.
      const old = await browser.$('#passwordForm input[name="old"]')
      await old.addValue(oldPassword)
      const passwordInput = await browser.$('#passwordForm input[name="password"]')
      await passwordInput.addValue(newPassword)
      const repeat = await browser.$('#passwordForm input[name="repeat"]')
      await repeat.addValue(newPassword)
      mail.once('sent', options => {
        test.equal(options.to, email, 'email')
        test.assert(options.subject.includes('Password'), 'Password')
      })
      const submitButton = await browser.$('#passwordForm button[type="submit"]')
      await submitButton.click()
      const p = await browser.$('p.message')
      const message = await p.getText()
      test.assert(message.includes('changed'), 'changed')
      await logout({ browser, port })
      await login({ browser, port, handle, password: newPassword })
      await verifyLogIn({ browser, test, port, handle, email })
    })().then(finish).catch(finish)

    function finish (error) {
      test.ifError(error)
      test.end()
      done()
    }
  })
})
