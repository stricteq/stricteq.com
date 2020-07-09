const mail = require('../mail').events
const server = require('./server')
const login = require('./login')
const signup = require('./signup')
const tape = require('tape')
const verifyLogIn = require('./verify-login')
const webdriver = require('./webdriver')

tape('change e-mail', test => {
  const name = 'Ana Tester'
  const location = 'US-CA'
  const handle = 'tester'
  const password = 'test password'
  const oldEMail = 'old@example.com'
  const newEMail = 'new@example.com'
  server((port, done) => {
    (async () => {
      const browser = await webdriver()
      // Sign up.
      await new Promise((resolve, reject) => {
        signup({
          browser, port, name, location, handle, password, email: oldEMail
        }, error => {
          if (error) return reject(error)
          resolve()
        })
      })
      await login({ browser, port, handle, password })
      await verifyLogIn({ browser, port, test, handle, email: oldEMail })
      // Navigate to password-change page.
      await browser.navigateTo('http://localhost:' + port)
      const account = await browser.$('a=Account')
      await account.click()
      const change = await browser.$('a=Change E-Mail')
      await change.click()
      // Submit password-change form.
      const emailInput = await browser.$('#emailForm input[name="email"]')
      await emailInput.addValue(newEMail)
      await Promise.all([
        new Promise((resolve, reject) => {
          mail.once('sent', options => {
            (async () => {
              test.equal(options.to, newEMail, 'TO: new email')
              test.assert(options.subject.includes('Confirm'), 'Confirm')
              const url = /<(http:\/\/[^ ]+)>/.exec(options.text)[1]
              await browser.navigateTo(url)
              const p = await browser.$('p.message')
              const text = await p.getText()
              test.assert(text.includes('changed'), 'changed')
            })().finally(resolve)
          })
        }),
        (async () => {
          const submit = await browser.$('#emailForm button[type="submit"]')
          await submit.click()
        })()
      ])
    })().finally(() => {
      test.end()
      done()
    })
  })
})

tape('change e-mail to existing', test => {
  const name = 'Ana Tester'
  const location = 'US-CA'
  const handle = 'tester'
  const password = 'test password'
  const email = 'test@example.com'
  server((port, done) => {
    (async () => {
      const browser = await webdriver()
      await new Promise((resolve, reject) => {
        signup({
          browser, port, name, location, handle, password, email
        }, error => {
          if (error) return reject(error)
          resolve()
        })
      })
      await login({ browser, port, handle, password })
      await verifyLogIn({ browser, port, test, handle, email })
      // Navigate to password-change page.
      const account = await browser.$('a=Account')
      await account.click()
      const change = await browser.$('a=Change E-Mail')
      await change.click()
      // Submit password-change form.
      const emailInput = await browser.$('#emailForm input[name="email"]')
      await emailInput.setValue(email)
      const submit = await browser.$('#emailForm button[type="submit"]')
      await submit.click()
      const error = await browser.$('.error')
      const errorText = await error.getText()
      test.assert(errorText.includes('already has'), 'already has')
    })().finally(() => {
      test.end()
      done()
    })
  })
})
