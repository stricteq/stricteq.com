const click = require('./click')
const connectStripe = require('./connect-stripe')
const login = require('./login')
const server = require('./server')
const signup = require('./signup')
const tape = require('tape')
const timeout = require('./timeout')
const webdriver = require('./webdriver')

tape('Stripe Connect', test => {
  const name = 'Ana Tester'
  const location = 'US-CA'
  const handle = 'tester'
  const password = 'test password'
  const email = 'tester@example.com'
  server((port, done) => {
    (async () => {
      const browser = await webdriver()
      await signup({ browser, port, name, location, handle, password, email })
      await login({ browser, port, handle, password })
      await connectStripe({ browser, port })
      // Confirm connected.
      const disconnect = await browser.$('#disconnect')
      const text = await disconnect.getText()
      test.equal(text, 'Disconnect Stripe Account', 'connected')
      // Disconnect.
      await click(browser, '#disconnect')
      const h2 = await browser.$('h2')
      const h2Text = await h2.getText()
      test.equal(h2Text, 'Disconnected Stripe Account', 'disconnected')
      await timeout(5000)
      // Navigate back to account page.
      await click(browser, '#account')
      // Confirm disconnected.
      const connect = await browser.$('#connect')
      const connectText = await connect.getText()
      test.equal(connectText, 'Connect Stripe Account', 'confirmed disconnected')
    })().then(finish).catch(finish)

    function finish (error) {
      test.ifError(error)
      test.end()
      done()
    }
  }, 8080)
})
