// Send E-Mail

import checkEnvironment from './environment.js'
import testEvents from './test-events.js'
import nodemailer from 'nodemailer'

const environment = checkEnvironment()

let transport

/* istanbul ignore if */
if (environment.production) {
  transport = nodemailer.createTransport({
    pool: true,
    host: process.env.SMTP_HOST || 'localhost',
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  })
}

export default (options, callback) => {
  /* istanbul ignore if */
  if (transport) {
    transport.sendMail(options, callback)
  } else {
    // This delay prevents tests from visiting account-confirmation
    // pages before the app has time to persist the tokens.
    setTimeout(() => {
      testEvents.emit('sent', options)
      callback()
    }, 1000)
  }
}
