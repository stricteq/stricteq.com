import addValue from './add-value.js'
import click from './click.js'
import login from './login.js'
import testEvents from '../test-events.js'
import signup from './signup.js'
import verifyLogIn from './verify-login.js'
import interactive from './interactive.js'

interactive('change e-mail', async ({ browser, port, test }) => {
  const name = 'Ana Tester'
  const location = 'US-CA'
  const handle = 'tester'
  const password = 'test password'
  const oldEMail = 'old@example.com'
  const newEMail = 'new@example.com'
  // Sign up.
  await signup({ browser, port, name, location, handle, password, email: oldEMail })
  await login({ browser, port, handle, password })
  await verifyLogIn({ browser, port, test, handle, email: oldEMail })
  // Navigate to password-change page.
  await browser.navigateTo('http://localhost:' + port)
  await click(browser, '#account')
  await click(browser, 'a=Change E-Mail')
  // Submit password-change form.
  const emailInput = await browser.$('#emailForm input[name="email"]')
  await emailInput.addValue(newEMail)
  await Promise.all([
    new Promise((resolve, reject) => {
      testEvents.once('sent', options => {
        (async () => {
          test.equal(options.to, newEMail, 'TO: new email')
          test.assert(options.subject.includes('Confirm'), 'Confirm')
          const url = /<(http:\/\/[^ ]+)>/.exec(options.text)[1]
          await browser.navigateTo(url)
          const p = await browser.$('p.message')
          const text = await p.getText()
          test.assert(text.includes('changed'), 'changed')
        })().then(resolve).catch(reject)
      })
    }),
    click(browser, '#emailForm button[type="submit"]')
  ])
})

interactive('change e-mail to existing', async ({ browser, port, test }) => {
  const name = 'Ana Tester'
  const location = 'US-CA'
  const handle = 'tester'
  const password = 'test password'
  const email = 'test@example.com'
  await signup({ browser, port, name, location, handle, password, email })
  await login({ browser, port, handle, password })
  await verifyLogIn({ browser, port, test, handle, email })
  // Navigate to password-change page.
  await click(browser, '#account')
  await click(browser, 'a=Change E-Mail')
  // Submit password-change form.
  await addValue(browser, '#emailForm input[name="email"]', email)
  await click(browser, '#emailForm button[type="submit"]')
  const error = await browser.$('.error')
  const errorText = await error.getText()
  test.assert(errorText.includes('already has'), 'already has')
})
