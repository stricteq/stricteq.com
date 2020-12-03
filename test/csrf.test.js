import * as csrf from '../csrf.js'
import tape from 'tape'
import { v4 as uuid } from 'uuid'

tape('CSRF round trip', (test) => {
  process.env.CSRF_KEY = csrf.randomKey()
  const action = '/logout'
  const sessionID = uuid()
  const { token, nonce } = csrf.generate({ action, sessionID })
  csrf.verify({ action, sessionID, token, nonce }, error => {
    test.ifError(error)
    test.end()
  })
})

tape('CSRF action mismatch', (test) => {
  process.env.CSRF_KEY = csrf.randomKey()
  const action = '/logout'
  const sessionID = uuid()
  const { token, nonce } = csrf.generate({ action, sessionID })
  csrf.verify({ action: '/login', sessionID, token, nonce }, error => {
    test.assert(error, 'error')
    test.equal(error.field, 'action', 'action')
    test.end()
  })
})

tape('CSRF session mismatch', (test) => {
  process.env.CSRF_KEY = csrf.randomKey()
  const action = '/logout'
  const sessionID = uuid()
  const { token, nonce } = csrf.generate({ action, sessionID })
  csrf.verify({ action, sessionID: uuid(), token, nonce }, error => {
    test.assert(error, 'error')
    test.equal(error.field, 'sessionID', 'sessionID')
    test.end()
  })
})

tape('CSRF corrupted', (test) => {
  process.env.CSRF_KEY = csrf.randomKey()
  const action = '/logout'
  const sessionID = uuid()
  let { token, nonce } = csrf.generate({ action, sessionID })
  token = token.split('').reverse().join('')
  csrf.verify({ action, sessionID: uuid(), token, nonce }, error => {
    test.assert(error, 'error')
    test.equal(error.decryption, true, 'decription')
    test.end()
  })
})

tape('CSRF round trip', (test) => {
  process.env.CSRF_KEY = csrf.randomKey()
  const action = '/logout'
  const sessionID = uuid()
  const date = new Date('2000-01-01').toISOString()
  const { token, nonce } = csrf.generate({ action, sessionID, date })
  csrf.verify({ action, sessionID, token, nonce }, error => {
    test.assert(error, 'error')
    test.equal(error.field, 'date', 'field=date')
    test.equal(error.date, date, 'date')
    test.end()
  })
})
