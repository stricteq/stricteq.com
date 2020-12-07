import connectStripe from './connect-stripe.js'
import interactive from './interactive.js'
import login from './login.js'
import signup from './signup.js'
import timeout from './timeout.js'

interactive('Stripe Connect', async ({ page, port, test }) => {
  const name = 'Ana Tester'
  const location = 'US-CA'
  const handle = 'tester'
  const password = 'test password'
  const email = 'tester@example.com'
  await signup({ page, port, name, location, handle, password, email })
  await login({ page, port, handle, password })
  await connectStripe({ page, port })
  // Confirm connected.
  const text = await page.textContent('#disconnect')
  test.equal(text, 'Disconnect Stripe Account', 'connected')
  // Disconnect.
  await page.click('#disconnect')
  const h2Text = await page.textContent('h2')
  test.equal(h2Text, 'Disconnected Stripe Account', 'disconnected')
  await timeout(7000)
  // Navigate back to account page.
  await page.click('#account')
  // Confirm disconnected.
  const connectText = await page.textContent('#connect')
  test.equal(connectText, 'Connect Stripe Account', 'confirmed disconnected')
}, 8080)
