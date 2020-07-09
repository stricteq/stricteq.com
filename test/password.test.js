const addValue = require('./add-value')
const click = require('./click')
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
      await signup({
        browser, port, name, location, handle, password: oldPassword, email
      })
      await browser.navigateTo('http://localhost:' + port)
      await login({ browser, port, handle, password: oldPassword })
      // Navigate to password-change page.
      await click(browser, 'a=Account')
      await click(browser, 'a=Change Password')
      // Submit password-change form.
      await addValue(browser, '#passwordForm input[name="old"]', oldPassword)
      await addValue(browser, '#passwordForm input[name="password"]', newPassword)
      await addValue(browser, '#passwordForm input[name="repeat"]', newPassword)
      mail.once('sent', options => {
        test.equal(options.to, email, 'email')
        test.assert(options.subject.includes('Password'), 'Password')
      })
      await click(browser, '#passwordForm button[type="submit"]')
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
