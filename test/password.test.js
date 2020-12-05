import interactive from './interactive.js'
import login from './login.js'
import logout from './logout.js'
import signup from './signup.js'
import testEvents from '../test-events.js'
import verifyLogIn from './verify-login.js'

interactive('change password', async ({ page, port, test }) => {
  const name = 'Ana Tester'
  const location = 'US-CA'
  const handle = 'tester'
  const oldPassword = 'old password'
  const newPassword = 'new password'
  const email = 'tester@example.com'
  await signup({
    page, port, name, location, handle, password: oldPassword, email
  })
  await page.goto('http://localhost:' + port)
  await login({ page, port, handle, password: oldPassword })
  // Navigate to password-change page.
  await page.click('#account')
  await page.click('"Change Password"')
  // Submit password-change form.
  await page.fill('#passwordForm input[name="old"]', oldPassword)
  await page.fill('#passwordForm input[name="password"]', newPassword)
  await page.fill('#passwordForm input[name="repeat"]', newPassword)
  testEvents.once('sent', ({ to, subject }) => {
    test.equal(to, email, 'email')
    test.assert(subject.includes('Password'), 'Password')
  })
  await page.click('#passwordForm button[type="submit"]')
  const message = await page.textContent('p.message')
  test.assert(message.includes('changed'), 'changed')
  await logout({ page, port })
  await login({ page, port, handle, password: newPassword })
  await verifyLogIn({ page, test, port, handle, email })
})
