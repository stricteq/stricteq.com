import addValue from './add-value.js'
import click from './click.js'
import interactive from './interactive.js'
import login from './login.js'
import logout from './logout.js'
import server from './server.js'
import signup from './signup.js'
import tap from 'tap'
import testEvents from '../test-events.js'
import verifyLogIn from './verify-login.js'

interactive('change password', async ({ browser, port, test }) => {
  const name = 'Ana Tester'
  const location = 'US-CA'
  const handle = 'tester'
  const oldPassword = 'old password'
  const newPassword = 'new password'
  const email = 'tester@example.com'
  await signup({
    browser, port, name, location, handle, password: oldPassword, email
  })
  await browser.navigateTo('http://localhost:' + port)
  await login({ browser, port, handle, password: oldPassword })
  // Navigate to password-change page.
  await click(browser, '#account')
  await click(browser, 'a=Change Password')
  // Submit password-change form.
  await addValue(browser, '#passwordForm input[name="old"]', oldPassword)
  await addValue(browser, '#passwordForm input[name="password"]', newPassword)
  await addValue(browser, '#passwordForm input[name="repeat"]', newPassword)
  testEvents.once('sent', options => {
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
})
