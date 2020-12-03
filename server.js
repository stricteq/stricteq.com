// `npm start` runs this script by npm convention.

import checkEnvironment from './environment.js'
import requestHandler from './index.js'
import http from 'http'
import pino from 'pino'
import pinoHTTP from 'pino-http'

// Logging

const logger = pino()
const addLoggers = pinoHTTP({ logger })

// Environment

const environment = checkEnvironment()
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

const server = http.createServer()

server.on('request', (request, response) => {
  try {
    addLoggers(request, response)
    requestHandler(request, response)
  } catch (error) {
    request.log.error(error)
  }
})

server.listen(process.env.PORT || 8080, () => {
  logger.info({ port: server.address().port }, 'listening')
})

function shutdown () {
  server.close(() => process.exit())
}
