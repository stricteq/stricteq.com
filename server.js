// `npm start` runs this script by npm convention.

// Logging

const logger = require('pino')()
const addLoggers = require('pino-http')({ logger })

// Environment

const environment = require('./environment')()
if (environment.missingVariables.length !== 0) {
  environment.missingVariables.forEach(missing => {
    logger.error({ variable: missing }, 'missing environment variable')
  })
  process.exit(1)
}
if (environment.missingPrograms.length !== 0) {
  environment.missingPrograms.forEach(missing => {
    logger.error({ program: missing }, 'missing external program')
  })
  process.exit(1)
}

// Error Handling

process
  .on('SIGTERM', shutdown)
  .on('SIGQUIT', shutdown)
  .on('SIGINT', shutdown)
  .on('uncaughtException', (error) => {
    logger.error(error, 'uncaughtException')
    shutdown()
  })

// HTTP Server

const server = require('http').createServer()
const handle = require('./')

server.on('request', (request, response) => {
  addLoggers(request, response)
  handle(request, response)
})

server.listen(process.env.PORT || 8080, () => {
  logger.info({ port: server.address().port }, 'listening')
})

function shutdown () {
  server.close(() => process.exit())
}
