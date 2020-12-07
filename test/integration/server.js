import assert from 'assert'
import checkEnvironment from '../../environment.js'
import constants from '../../constants.js'
import { randomKey as randomCSRFKey } from '../../csrf.js'
import fs from 'fs'
import handle from '../../index.js'
import http from 'http'
import os from 'os'
import path from 'path'
import pino from 'pino'
import pinoHTTP from 'pino-http'
import rimraf from 'rimraf'
import runSeries from 'run-series'
import signatures from '../../signatures.js'
import simpleConcat from 'simple-concat'
import { spawn } from 'child_process'
import testEvents from '../../test-events.js'

export default (callback, port) => {
  assert(typeof callback === 'function')
  port = port === undefined ? 0 : port
  const logger = pino({}, fs.createWriteStream('test-server.log'))
  const addLoggers = pinoHTTP({ logger })
  process.env.CSRF_KEY = randomCSRFKey()
  const keys = signatures.keys()
  process.env.PUBLIC_KEY = keys.publicKey
  process.env.PRIVATE_KEY = keys.privateKey
  let directory
  let webServer
  let stripeListen
  fs.mkdtemp(path.join(os.tmpdir(), constants.website.toLowerCase() + '-'), (error, tmp) => {
    if (error) {
      cleanup()
      throw error
    }
    directory = tmp
    process.env.DIRECTORY = tmp
    webServer = http.createServer((request, response) => {
      addLoggers(request, response)
      handle(request, response)
    })
    webServer.listen(port, function () {
      const port = this.address().port
      process.env.BASE_HREF = 'http://localhost:' + port
      process.env.ADMIN_EMAIL = 'admin@example.com'
      process.env.NOTIFICATIONS_EMAIL = 'notifications@mail.stricteq.com'
      process.env.MINIMUM_COMMISSION = '5'
      const environment = checkEnvironment()
      if (environment.missingVariables.length !== 0) {
        cleanup()
        environment.missingVariables.forEach(missing => {
          process.stderr.write(`Missing environment variable: ${missing}\n`)
        })
        assert(false)
      }
      if (environment.missingPrograms.length !== 0) {
        cleanup()
        environment.missingPrograms.forEach(missing => {
          process.stderr.write(`Missing external program: ${missing}\n`)
        })
        assert(false)
      }
      runSeries([
        function setWebhookSecret (done) {
          const stripeSecret = spawn('stripe', ['listen', '--print-secret'])
          simpleConcat(stripeSecret.stdout, (_, buffer) => {
            const secret = buffer.toString().trim()
            process.env.STRIPE_WEBHOOK_SECRET = secret
            logger.info({ secret }, 'Stripe webhook secret')
            done()
          })
        },
        function listenForEvents (done) {
          const events = [
            'account.application.deauthorized',
            'payment_intent.succeeded'
          ]
          const stripeArguments = [
            'listen',
            '--skip-update',
            '--print-json',
            '--forward-to', `localhost:${port}/stripe-webhook`,
            '--events', events.join(',')
          ]
          stripeListen = spawn('stripe', stripeArguments)
          stripeListen.stdout.pipe(fs.createWriteStream('stripe.out.log'))
          stripeListen.stderr.pipe(fs.createWriteStream('stripe.err.log'))
          stripeListen.stderr.addListener('data', listenForRead)
          let chunks = []
          function listenForRead (chunk) {
            chunks.push(chunk)
            if (Buffer.concat(chunks).toString().includes('Ready!')) {
              chunks = null
              stripeListen.stderr.removeListener('data', listenForRead)
              done()
            }
          }
        }
      ], () => {
        callback(port, cleanup)
      })
    })
  })

  function cleanup () {
    testEvents.removeAllListeners()
    if (webServer) webServer.close()
    if (directory) rimraf(directory, () => {})
    if (stripeListen) stripeListen.kill()
  }
}
