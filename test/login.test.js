import addValue from './add-value.js'
import click from './click.js'
import http from 'http'
import login from './login.js'
import server from './server.js'
import signup from './signup.js'
import tap from 'tap'
import verifyLogIn from './verify-login.js'
import interactive from './interactive.js'

const path = '/login'

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
  await click(browser, '#login')
  const h2 = await browser.$('h2')
  const title = await h2.getText()
  test.equal(title, 'Log In', '<h2>Log In</h2>')
})

interactive('sign in', async ({ browser, port, test }) => {
  const name = 'Ana Tester'
  const location = 'US-CA'
  const handle = 'ana'
  const password = 'test password'
  const email = 'ana@example.com'
  await signup({ browser, port, name, location, handle, password, email })
  await browser.navigateTo('http://localhost:' + port)
  await click(browser, '#login')
  await addValue(browser, '#loginForm input[name="handle"]', handle)
  await addValue(browser, '#loginForm input[name="password"]', password)
  await click(browser, '#loginForm button[type="submit"]')
  await verifyLogIn({ browser, port, test, handle, email })
})

interactive('sign in with bad credentials', async ({ browser, port, test }) => {
  await browser.navigateTo('http://localhost:' + port)
  await login({ browser, port, handle: 'invalid', password: 'invalid' })
  const error = await browser.$('p.error')
  const errorText = await error.getText()
  test.assert(errorText.includes('invalid'), 'invalid')
})

interactive('lockout', async ({ browser, port, test }) => {
  const name = 'Ana Tester'
  const location = 'US-CA'
  const handle = 'ana'
  const password = 'test password'
  const email = 'ana@example.com'
  await signup({ browser, port, name, location, handle, password, email })
  await loginWithPassword('invalid', 'invalid handle or password')
  await loginWithPassword('invalid', 'invalid handle or password')
  await loginWithPassword('invalid', 'invalid handle or password')
  await loginWithPassword('invalid', 'invalid handle or password')
  await loginWithPassword('invalid', 'invalid handle or password')
  await loginWithPassword(password, 'account locked')
  async function loginWithPassword (password, message) {
    await browser.navigateTo('http://localhost:' + port)
    await click(browser, '#login')
    await addValue(browser, '#loginForm input[name="handle"]', handle)
    await addValue(browser, '#loginForm input[name="password"]', password)
    await click(browser, '#loginForm button[type="submit"]')
    const error = await browser.$('p.error')
    const errorText = await error.getText()
    test.equal(errorText, message, message)
  }
})
