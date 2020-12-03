import click from './click.js'
import http from 'http'
import login from './login.js'
import logout from './logout.js'
import server from './server.js'
import signup from './signup.js'
import tape from 'tape'
import verifyLogIn from './verify-login.js'
import webdriver from './webdriver.js'

const path = '/logout'

tape('GET ' + path, test => {
  server((port, done) => {
    http.request({ path, port })
      .once('response', response => {
        test.equal(response.statusCode, 405, '405')
        test.end()
        done()
      })
      .end()
  })
})

tape('log out', test => {
  const name = 'Ana Tester'
  const location = 'US-CA'
  const handle = 'ana'
  const password = 'test password'
  const email = 'ana@example.com'
  server((port, done) => {
    (async () => {
      const browser = await webdriver()
      await signup({ browser, port, name, location, handle, password, email })
      await login({ browser, port, handle, password })
      await verifyLogIn({ browser, port, test, handle, email })
      await click(browser, '#logout')
      await browser.navigateTo('http://localhost:' + port)
      const loginButton = await browser.$('#login')
      const buttonText = await loginButton.getText()
      test.equal(buttonText, 'Log In', 'Log In')
    })().then(finish).catch(finish)

    function finish (error) {
      test.ifError(error)
      test.end()
      done()
    }
  })
})

tape('log in as ana, log in as bob', test => {
  const ana = {
    name: 'Ana Tester',
    location: 'US-CA',
    handle: 'ana',
    password: 'ana password',
    email: 'ana@example.com'
  }
  const bob = {
    name: 'Bobj Tester',
    location: 'US-NY',
    handle: 'bob',
    password: 'bob password',
    email: 'bob@example.com'
  }
  server((port, done) => {
    (async () => {
      const browser = await webdriver()
      await signup({
        browser,
        port,
        name: ana.name,
        location: ana.location,
        handle: ana.handle,
        password: ana.password,
        email: ana.email
      })
      await signup({
        browser,
        port,
        name: bob.name,
        location: bob.location,
        handle: bob.handle,
        password: bob.password,
        email: bob.email
      })
      await login({ browser, port, handle: ana.handle, password: ana.password })
      await verifyLogIn({ browser, port, test, handle: ana.handle, email: ana.email })
      await logout({ browser, port })
      await login({ browser, port, handle: bob.handle, password: bob.password })
      await verifyLogIn({ browser, port, test, handle: bob.handle, email: bob.email })
    })().then(finish).catch(finish)

    function finish (error) {
      test.ifError(error)
      test.end()
      done()
    }
  })
})
