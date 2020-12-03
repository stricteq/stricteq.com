import click from './click.js'
import http from 'http'
import mail from '../mail.js'
import server from './server.js'
import signup from './signup.js'
import tape from 'tape'
import verifyLogIn from './verify-login.js'
import webdriver from './webdriver.js'

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
      await signup({ browser, port, name, location, handle, password, email })
      await browser.navigateTo('http://localhost:' + port)
      await click(browser, '#login')
      await click(browser, 'a=Reset Password')
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
        click(browser, '#resetForm button[type="submit"]')
      ])
      await browser.navigateTo(url)
      // Fill reset form.
      const passwordInput = await browser.$('#passwordForm input[name="password"]')
      await passwordInput.addValue(password)
      const repeatInput = await browser.$('#passwordForm input[name="repeat"]')
      await repeatInput.addValue(password)
      await click(browser, '#passwordForm button[type="submit"]')
      // Navigate to log-in form.
      await click(browser, '#login')
      // Fill log-in form.
      const loginHandleInput = await browser.$('#loginForm input[name="handle"]')
      await loginHandleInput.addValue(handle)
      const loginPasswordInput = await browser.$('#loginForm input[name="password"]')
      await loginPasswordInput.addValue(password)
      await click(browser, '#loginForm button[type="submit"]')
      await verifyLogIn({ browser, port, test, handle, email })
    })().then(finish).catch(finish)

    function finish (error) {
      test.ifError(error)
      test.end()
      done()
    }
  })
})
