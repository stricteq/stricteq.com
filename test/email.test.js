import login from './login.js'
import testEvents from '../test-events.js'
import signup from './signup.js'
import verifyLogIn from './verify-login.js'
import interactive from './interactive.js'

interactive('change e-mail', async ({ page, port, test }) => {
  const name = 'Ana Tester'
  const location = 'US-CA'
  const handle = 'tester'
  const password = 'test password'
  const oldEMail = 'old@example.com'
  const newEMail = 'new@example.com'
  // Sign up.
  await signup({ page, port, name, location, handle, password, email: oldEMail })
  await login({ page, port, handle, password })
  await verifyLogIn({ page, port, test, handle, email: oldEMail })
  // Navigate to password-change page.
  await page.goto('http://localhost:' + port)
  await page.click('#account')
  await page.click('"Change E-Mail"')
  // Submit password-change form.
  const emailInput = await page.$('#emailForm input[name="email"]')
  await emailInput.fill(newEMail)
  await Promise.all([
    new Promise((resolve, reject) => {
      testEvents.once('sent', ({ to, subject, text }) => {
        (async () => {
          test.equal(to, newEMail, 'TO: new email')
          test.assert(subject.includes('Confirm'), 'Confirm')
          const url = /<(http:\/\/[^ ]+)>/.exec(text)[1]
          await page.goto(url)
          const message = await page.textContent('p.message')
          test.assert(message.includes('changed'), 'changed')
        })().then(resolve).catch(reject)
      })
    }),
    page.click('#emailForm button[type="submit"]')
  ])
})

interactive('change e-mail to existing', async ({ page, port, test }) => {
  const name = 'Ana Tester'
  const location = 'US-CA'
  const handle = 'tester'
  const password = 'test password'
  const email = 'test@example.com'
  await signup({ page, port, name, location, handle, password, email })
  await login({ page, port, handle, password })
  await verifyLogIn({ page, port, test, handle, email })
  // Navigate to password-change page.
  await page.click('#account')
  await page.click('"Change E-Mail"')
  // Submit password-change form.
  await page.fill('#emailForm input[name="email"]', email)
  await page.click('#emailForm button[type="submit"]')
  const error = await page.textContent('.error')
  test.assert(error.includes('already has'), 'already has')
})
