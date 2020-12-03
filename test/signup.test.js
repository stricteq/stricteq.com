import addValue from './add-value.js'
import click from './click.js'
import http from 'http'
import interactive from './interactive.js'
import login from './login.js'
import server from './server.js'
import signup from './signup.js'
import tap from 'tap'
import verifyLogIn from './verify-login.js'

const path = '/signup'

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

interactive('browse ' + path, async ({ browser, port, test }) => {
  await browser.navigateTo('http://localhost:' + port)
  await click(browser, 'a=Sign Up')
  const h2 = await browser.$('h2')
  const title = await h2.getText()
  test.equal(title, 'Sign Up', '<h2>Sign Up</h2>')
})

interactive('sign up', async ({ browser, port, test }) => {
  const name = 'Super Tester'
  const location = 'US-CA'
  const email = 'test@example.com'
  const handle = 'tester'
  const password = 'test password'
  await browser.navigateTo('http://localhost:' + port)
  await signup({ browser, port, name, location, email, handle, password })
  await login({ browser, port, handle, password })
  await verifyLogIn({ browser, port, test, handle, email })
})

interactive('sign up same handle', async ({ browser, port, test }) => {
  const firstEMail = 'first@example.com'
  const secondEMail = 'second@example.com'
  const name = 'Super Tester'
  const location = 'US-CA'
  const handle = 'tester'
  const password = 'test password'
  // Sign up using the handle.
  await signup({ browser, port, name, location, handle, password, email: firstEMail })

  // Try to sign up again with the same handle.
  await browser.navigateTo('http://localhost:' + port)
  await click(browser, 'a=Sign Up')
  await addValue(browser, '#signupForm input[name="name"]', name)
  await addValue(browser, '#signupForm input[name="location"]', location)
  await addValue(browser, '#signupForm input[name="email"]', secondEMail)
  await addValue(browser, '#signupForm input[name="handle"]', handle)
  await addValue(browser, '#signupForm input[name="password"]', password)
  await addValue(browser, '#signupForm input[name="repeat"]', password)
  await click(browser, '#signupForm button[type="submit"]')
  const errorElement = await browser.$('.error')
  const errorText = await errorElement.getText()
  test.comment(errorText)
  test.assert(errorText.includes('taken'), 'handle taken')

  const newEMailInput = await browser.$('input[name="email"]')
  const emailValue = await newEMailInput.getValue()
  test.equal(emailValue, secondEMail, 'preserves e-mail value')

  const newHandleInput = await browser.$('input[name="handle"]')
  const handleValue = await newHandleInput.getValue()
  test.equal(handleValue, handle, 'preserves handle value')

  const newPasswordInput = await browser.$('input[name="password"]')
  const passwordValue = await newPasswordInput.getValue()
  test.equal(passwordValue, '', 'empties password')

  const newRepeatInput = await browser.$('input[name="repeat"]')
  const repeatValue = await newRepeatInput.getValue()
  test.equal(repeatValue, '', 'empties password repeat')
})

interactive('sign up same email', async ({ browser, port, test }) => {
  const name = 'Super Tester'
  const location = 'US-CA'
  const email = 'first@example.com'
  const firstHandle = 'first'
  const secondHandle = 'second'
  const password = 'test password'
  await signup({ browser, port, name, location, handle: firstHandle, password, email })

  // Try to sign up again with the same e-mail.
  await browser.navigateTo('http://localhost:' + port)
  await click(browser, 'a=Sign Up')
  await addValue(browser, '#signupForm input[name="name"]', name)
  await addValue(browser, '#signupForm input[name="location"]', location)
  await addValue(browser, '#signupForm input[name="email"]', email)
  await addValue(browser, '#signupForm input[name="handle"]', secondHandle)
  await addValue(browser, '#signupForm input[name="password"]', password)
  await addValue(browser, '#signupForm input[name="repeat"]', password)
  await click(browser, '#signupForm button[type="submit"]')
  const p = await browser.$('.error')
  const errorText = await p.getText()
  test.assert(errorText.includes('e-mail'), 'e-mail')
})
