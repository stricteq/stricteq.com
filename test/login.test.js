const http = require('http')
const login = require('./login')
const server = require('./server')
const signup = require('./signup')
const tape = require('tape')
const verifyLogIn = require('./verify-login')
const webdriver = require('./webdriver')

const path = '/login'

tape('GET ' + path, test => {
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

tape('browse ' + path, test => {
  server((port, done) => {
    (async () => {
      const browser = await webdriver()
      await browser.navigateTo('http://localhost:' + port)
      const loginButton = await browser.$('#login')
      await loginButton.click()
      const h2 = await browser.$('h2')
      const title = await h2.getText()
      test.equal(title, 'Log In', '<h2>Log In</h2>')
    })().then(finish).catch(finish)

    function finish (error) {
      test.ifError(error)
      test.end()
      done()
    }
  })
})

tape('sign in', test => {
  const name = 'Ana Tester'
  const location = 'US-CA'
  const handle = 'ana'
  const password = 'test password'
  const email = 'ana@example.com'
  server((port, done) => {
    (async () => {
      const browser = await webdriver()
      await new Promise((resolve, reject) => {
        signup({
          browser, port, name, location, handle, password, email
        }, error => {
          if (error) return reject(error)
          resolve()
        })
      })
      await browser.navigateTo('http://localhost:' + port)
      const loginButton = await browser.$('#login')
      await loginButton.click()
      const handleInput = await browser.$('#loginForm input[name="handle"]')
      await handleInput.addValue(handle)
      const passwordInput = await browser.$('#loginForm input[name="password"]')
      await passwordInput.addValue(password)
      const submitButton = await browser.$('#loginForm button[type="submit"]')
      await submitButton.click()
      await verifyLogIn({ browser, port, test, handle, email })
    })().then(finish).catch(finish)

    function finish (error) {
      test.ifError(error)
      test.end()
      done()
    }
  })
})

tape('sign in with bad credentials', test => {
  server((port, done) => {
    (async () => {
      const browser = await webdriver()
      await browser.navigateTo('http://localhost:' + port)
      await login({ browser, port, handle: 'invalid', password: 'invalid' })
      const error = await browser.$('p.error')
      const errorText = await error.getText()
      test.assert(errorText.includes('invalid'), 'invalid')
    })().then(finish).catch(finish)

    function finish (error) {
      test.ifError(error)
      test.end()
      done()
    }
  })
})

tape('lockout', test => {
  const name = 'Ana Tester'
  const location = 'US-CA'
  const handle = 'ana'
  const password = 'test password'
  const email = 'ana@example.com'
  server((port, done) => {
    (async () => {
      const browser = await webdriver()
      await new Promise((resolve, reject) => {
        signup({
          browser, port, name, location, handle, password, email
        }, error => {
          if (error) return reject(error)
          resolve()
        })
      })
      await loginWithPassword('invalid', 'invalid handle or password')
      await loginWithPassword('invalid', 'invalid handle or password')
      await loginWithPassword('invalid', 'invalid handle or password')
      await loginWithPassword('invalid', 'invalid handle or password')
      await loginWithPassword('invalid', 'invalid handle or password')
      await loginWithPassword(password, 'account locked')
      async function loginWithPassword (password, message) {
        await browser.navigateTo('http://localhost:' + port)
        const loginButton = await browser.$('#login')
        await loginButton.click()
        const handleInput = await browser.$('#loginForm input[name="handle"]')
        await handleInput.addValue(handle)
        const passwordInput = await browser.$('#loginForm input[name="password"]')
        await passwordInput.addValue(password)
        const submitButton = await browser.$('#loginForm button[type="submit"]')
        await submitButton.click()
        const error = await browser.$('p.error')
        const errorText = await error.getText()
        test.equal(errorText, message, message)
      }
    })().then(finish).catch(finish)

    function finish (error) {
      test.ifError(error)
      test.end()
      done()
    }
  })
})
