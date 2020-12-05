import constants from '../constants.js'
import { randomKey as randomCSRFKey } from '../csrf.js'
import fs from 'fs'
import rimraf from 'rimraf'
import runSeries from 'run-series'
import signatures from '../signatures.js'
import { spawn } from 'child_process'
import tap from 'tap'

tap.test('server', test => {
  fs.mkdtemp('/tmp/', (_, directory) => {
    let server, curl
    const serverPort = 8989
    runSeries([
      done => {
        const keys = signatures.keys()
        server = spawn('node', ['server.js'], {
          env: {
            PORT: serverPort,
            NODE_ENV: 'test',
            BASE_HREF: 'http://localhost:' + serverPort + '/',
            CSRF_KEY: randomCSRFKey(),
            PUBLIC_KEY: keys.publicKey,
            PRIVATE_KEY: keys.privateKey,
            MINIMUM_COMMISSION: 5,
            NOTIFICATIONS_EMAIL: 'notifications@mail.stricteq.com',
            DIRECTORY: directory,
            STRIPE_CLIENT_ID: process.env.STRIPE_CLIENT_ID,
            STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
            STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY
          }
        })
        server.stdout.once('data', () => {
          test.pass('spawned server')
          done()
        })
      }
    ], error => {
      test.ifError(error, 'no error')
      curl = spawn('curl', ['http://localhost:' + serverPort])
      const chunks = []
      curl.stdout
        .on('data', chunk => { chunks.push(chunk) })
        .once('end', () => {
          const output = Buffer.concat(chunks).toString()
          test.assert(
            output.includes(`<h1>${constants.website}</h1>`),
            `output includes <h1>${constants.website}</h1>`
          )
          server.kill(9)
          curl.kill(9)
          rimraf.sync(directory)
          test.end()
        })
    })
  })
})
