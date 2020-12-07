import * as csrf from '../../csrf.js'
import tap from 'tap'
import { v4 as uuid } from 'uuid'

tap.test('CSRF round trip', (test) => {
  process.env.CSRF_KEY = csrf.randomKey()
  const action = '/logout'
  const sessionID = uuid()
  const { token, nonce } = csrf.generate({ action, sessionID })
  csrf.verify({ action, sessionID, token, nonce }, error => {
    test.ifError(error)
    test.end()
  })
})

tap.test('CSRF action mismatch', (test) => {
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

tap.test('CSRF session mismatch', (test) => {
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

tap.test('CSRF corrupted', (test) => {
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

tap.test('CSRF round trip', (test) => {
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
