// Send E-Mail

const environment = require('./environment')()

/* istanbul ignore if */
if (environment.production) {
  const nodemailer = require('nodemailer')
  const transport = nodemailer.createTransport({
    pool: true,
    host: process.env.SMTP_HOST || 'localhost',
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  })
  module.exports = transport.sendMail.bind(transport)
} else /* in testing */ {
  const emitter = require('./test-events')
  module.exports = (options, callback) => {
    // This delay prevents tests from visiting account-confirmation
    // pages before the app has time to persist the tokens.
    setTimeout(() => {
      emitter.emit('sent', options)
      callback()
    }, 1000)
  }
  module.exports.events = emitter
}
