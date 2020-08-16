const click = require('./click')
const login = require('./login')
const server = require('./server')
const signup = require('./signup')
const tape = require('tape')
const verifyLogIn = require('./verify-login')
const webdriver = require('./webdriver')

tape('change affiliations', test => {
  const name = 'Ana Tester'
  const location = 'US-CA'
  const handle = 'tester'
  const password = 'test password'
  const email = 'ana@example.com'
  const affiliations = 'SomeCo, Inc.'
  server((port, done) => {
    (async () => {
      const browser = await webdriver()
      // Sign up.
      await signup({ browser, port, name, location, handle, password, email })
      await login({ browser, port, handle, password })
      await verifyLogIn({ browser, port, test, handle, email })
      // Navigate to afiliations-change page.
      await browser.navigateTo('http://localhost:' + port)
      await click(browser, '#account')
      await click(browser, 'a=Change Affiliations')
      // Submit password-change form.
      const input = await browser.$('#affiliationsForm input[name="affiliations"]')
      await input.setValue(affiliations)
      await click(browser, '#affiliationsForm button[type="submit"]')
      const displayed = await browser.$('.affiliations')
      await displayed.waitForExist()
      const text = await displayed.getText()
      test.equal(text, affiliations, 'displays new affiliations')
    })().then(finish).catch(finish)

    function finish (error) {
      test.ifError(error)
      test.end()
      done()
    }
  })
})
