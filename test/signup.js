const assert = require('assert')
const click = require('./click')
const mail = require('../mail').events

module.exports = ({
  name,
  location,
  handle,
  password,
  email,
  browser,
  port
}, callback) => {
  assert(browser)
  assert(Number.isSafeInteger(port))
  assert(typeof name === 'string')
  assert(typeof location === 'string')
  assert(typeof handle === 'string')
  assert(typeof password === 'string')
  assert(typeof email === 'string')
  browser.navigateTo('http://localhost:' + port)
    .then(() => click(browser, 'a=Sign Up'))
    .then(() => browser.$('#signupForm input[name="name"]'))
    .then(input => input.addValue(name))
    .then(() => browser.$('#signupForm input[name="location"]'))
    .then(input => input.addValue(location))
    .then(() => browser.$('#signupForm input[name="email"]'))
    .then(input => input.addValue(email))
    .then(() => browser.$('#signupForm input[name="handle"]'))
    .then(input => input.addValue(handle))
    .then(() => browser.$('#signupForm input[name="password"]'))
    .then(input => input.addValue(password))
    .then(() => browser.$('#signupForm input[name="repeat"]'))
    .then(input => input.addValue(password))
    .then(() => click(browser, '#signupForm button[type="submit"]'))
    .catch(callback)
  mail.once('sent', options => {
    if (!options.subject.includes('Confirm')) {
      return callback(new Error('no confirmation e-mail'))
    }
    const url = /<(http:\/\/[^ ]+)>/.exec(options.text)[1]
    browser.navigateTo(url)
      .then(() => { callback() })
      .catch(callback)
  })
}
// TODO: Test admin notification of signup.
/*
mail.once('sent', options => {
  test.equal(options.subject, 'Sign Up', 'admin notification')
  test.assert(options.text.includes(handle), 'includes handle')
  test.assert(options.text.includes(email), 'includes email')
  resolve()
})
*/
