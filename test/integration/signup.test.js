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

interactive('browse ' + path, async ({ page, port, test }) => {
  await page.goto('http://localhost:' + port)
  await page.click('"Sign Up"')
  const title = await page.textContent('h2')
  test.equal(title, 'Sign Up', '<h2>Sign Up</h2>')
})

interactive('sign up', async ({ page, port, test }) => {
  const name = 'Super Tester'
  const location = 'US-CA'
  const email = 'test@example.com'
  const handle = 'tester'
  const password = 'test password'
  await page.goto('http://localhost:' + port)
  await signup({ page, port, name, location, email, handle, password })
  await login({ page, port, handle, password })
  await verifyLogIn({ page, port, test, handle, email })
})

interactive('sign up same handle', async ({ page, port, test }) => {
  const firstEMail = 'first@example.com'
  const secondEMail = 'second@example.com'
  const name = 'Super Tester'
  const location = 'US-CA'
  const handle = 'tester'
  const password = 'test password'
  // Sign up using the handle.
  await signup({ page, port, name, location, handle, password, email: firstEMail })

  // Try to sign up again with the same handle.
  await page.goto('http://localhost:' + port)
  await page.click('"Sign Up"')
  await page.fill('#signupForm input[name="name"]', name)
  await page.fill('#signupForm input[name="location"]', location)
  await page.fill('#signupForm input[name="email"]', secondEMail)
  await page.fill('#signupForm input[name="handle"]', handle)
  await page.fill('#signupForm input[name="password"]', password)
  await page.fill('#signupForm input[name="repeat"]', password)
  await page.click('#signupForm button[type="submit"]')
  const errorText = await page.textContent('.error')
  test.assert(errorText.includes('taken'), 'handle taken')

  const emailValue = await page.getAttribute('input[name="email"]', 'value')
  test.equal(emailValue, secondEMail, 'preserves e-mail value')

  const handleValue = await page.getAttribute('input[name="handle"]', 'value')
  test.equal(handleValue, handle, 'preserves handle value')

  const passwordValue = await page.getAttribute('input[name="password"]', 'value')
  test.equal(passwordValue, null, 'empties password')

  const repeatValue = await page.getAttribute('input[name="repeat"]', 'value')
  test.equal(repeatValue, null, 'empties password repeat')
})

interactive('sign up same email', async ({ page, port, test }) => {
  const name = 'Super Tester'
  const location = 'US-CA'
  const email = 'first@example.com'
  const firstHandle = 'first'
  const secondHandle = 'second'
  const password = 'test password'
  await signup({ page, port, name, location, handle: firstHandle, password, email })

  // Try to sign up again with the same e-mail.
  await page.goto('http://localhost:' + port)
  await page.click('"Sign Up"')
  const signupForm = '#signupForm'
  await page.fill(`${signupForm} input[name="name"]`, name)
  await page.fill(`${signupForm} input[name="location"]`, location)
  await page.fill(`${signupForm} input[name="email"]`, email)
  await page.fill(`${signupForm} input[name="handle"]`, secondHandle)
  await page.fill(`${signupForm} input[name="password"]`, password)
  await page.fill(`${signupForm} input[name="repeat"]`, password)
  await page.click(`${signupForm} button[type="submit"]`)
  const errorText = await page.textContent('.error')
  test.assert(errorText.includes('e-mail'), 'e-mail')
})
