import click from './click.js'

export default ({ browser, port }, callback) => {
  return browser.navigateTo('http://localhost:' + port + '/')
    .then(() => click(browser, '#logout'))
    .catch(callback)
}
