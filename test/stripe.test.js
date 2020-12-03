import click from './click.js'
import connectStripe from './connect-stripe.js'
import interactive from './interactive.js'
import login from './login.js'
import server from './server.js'
import signup from './signup.js'
import tap from 'tap'
import timeout from './timeout.js'

interactive('Stripe Connect', async ({ browser, port, test }) => {
  const name = 'Ana Tester'
  const location = 'US-CA'
  const handle = 'tester'
  const password = 'test password'
  const email = 'tester@example.com'
  await signup({ browser, port, name, location, handle, password, email })
  await login({ browser, port, handle, password })
  await connectStripe({ browser, port })
  // Confirm connected.
  const disconnect = await browser.$('#disconnect')
  await disconnect.waitForExist()
  const text = await disconnect.getText()
  test.equal(text, 'Disconnect Stripe Account', 'connected')
  // Disconnect.
  await click(browser, '#disconnect')
  const h2 = await browser.$('h2')
  await h2.waitForExist()
  const h2Text = await h2.getText()
  test.equal(h2Text, 'Disconnected Stripe Account', 'disconnected')
  await timeout(7000)
  // Navigate back to account page.
  await click(browser, '#account')
  // Confirm disconnected.
  const connect = await browser.$('#connect')
  await connect.waitForExist()
  const connectText = await connect.getText()
  test.equal(connectText, 'Connect Stripe Account', 'confirmed disconnected')
}, 8080)
