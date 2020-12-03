import http from 'http'
import server from './server.js'
import login from './login.js'
import signup from './signup.js'
import tape from 'tape'
import verifyLogIn from './verify-login.js'
import webdriver from './webdriver.js'

const path = '/account'

tape('GET ' + path, test => {
  server((port, done) => {
    http.request({ path, port })
      .once('response', response => {
        test.equal(response.statusCode, 302, '302')
        test.equal(response.headers.location, '/login', 'redirect')
        test.end()
        done()
      })
      .end()
  })
})

tape('browse ' + path, test => {
  const name = 'Ana Tester'
  const location = 'US-CA'
  const handle = 'ana'
  const password = 'ana password'
  const email = 'ana@example.com'
  server((port, done) => {
    (async () => {
      const browser = await webdriver()
      await signup({ browser, port, name, location, handle, password, email })
      await login({ browser, port, handle, password })
      await verifyLogIn({ browser, test, port, email, handle })
    })().then(finish).catch(finish)

    function finish (error) {
      test.ifError(error)
      test.end()
      done()
    }
  })
})
