import server from './server.js'
import tap from 'tap'
import webdriver from 'webdriverio'

export default (label, logic, port = 0) => {
  tap.test(label, test => {
    server((port, done) => {
      test.teardown(done)
      ;(async () => {
        let browser
        try {
          browser = await webdriver.remote({
            logLevel: 'error',
            path: '/',
            capabilities: { browserName: 'firefox' }
          })
          await logic({ test, browser, port })
        } catch (error) {
          test.ifError(error)
        } finally {
          if (browser) {
            browser.deleteSession().finally(() => test.end())
          } else {
            test.end()
          }
        }
      })()
    }, port)
  })
}
