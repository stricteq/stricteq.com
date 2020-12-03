import webdriverio from 'webdriverio'

// See: https://webdriver.io/docs/runprogrammatically.html

let remote

export default function () {
  if (!remote) {
    remote = webdriverio.remote({
      logLevel: 'error',
      path: '/',
      capabilities: { browserName: 'firefox' }
    })
  }
  return remote
}
