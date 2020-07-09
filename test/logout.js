const click = require('./click')

module.exports = ({ browser, port }, callback) => {
  return browser.navigateTo('http://localhost:' + port + '/')
    .then(() => click(browser, '#logout'))
    .catch(callback)
}
