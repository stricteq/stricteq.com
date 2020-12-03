// Store and Verify Passwords
/* eslint-disable no-var */

import { accountLock as accountLockExpired } from './expired.js'
import * as storage from './storage.js'
import securePassword from 'secure-password'

const passwordHashing = securePassword()

export const hash = (password, callback) => {
  const passwordBuffer = Buffer.from(password)
  passwordHashing.hash(passwordBuffer, (error, hashBuffer) => {
    /* istanbul ignore if */
    if (error) return callback(error)
    callback(null, hashBuffer.toString('hex'))
  })
}

export const verify = (handle, password, callback) => {
  const file = storage.account.filePath(handle)
  storage.lock(file, unlock => {
    callback = unlock(callback)
    storage.account.readWithoutLocking(handle, function (error, account) {
      /* istanbul ignore next */
      if (error) {
        error.statusCode = 500
        return callback(error)
      }
      if (account === null || account.confirmed === false) {
        const invalid = new Error('invalid handle or password')
        invalid.statusCode = 401
        return callback(invalid, account)
      }
      const locked = account.locked
      if (locked && !accountLockExpired(locked)) {
        const locked = new Error('account locked')
        locked.statusCode = 401
        return callback(locked, account)
      }
      const passwordHash = Buffer.from(account.passwordHash, 'hex')
      const passwordBuffer = Buffer.from(password, 'utf8')
      passwordHashing.verify(
        passwordBuffer, passwordHash, (error, result) => {
          /* istanbul ignore next */
          if (error) {
            error.statusCode = 500
            return callback(error)
          }
          switch (result) {
            /* istanbul ignore next */
            case securePassword.INVALID_UNRECOGNIZED_HASH:
              var unrecognized = new Error('unrecognized hash')
              unrecognized.statusCode = 500
              return callback(unrecognized)
            case securePassword.INVALID:
              var invalid = new Error('invalid handle or password')
              invalid.statusCode = 403
              return callback(invalid, account)
            /* istanbul ignore next */
            case securePassword.VALID_NEEDS_REHASH:
              return passwordHashing.hash(passwordBuffer, (error, newHash) => {
                if (error) {
                  error.statusCode = 500
                  return callback(error)
                }
                account.passwordHash = newHash.toString('hex')
                storage.account.writeWithoutLocking(handle, account, 'w', error => {
                  if (error) return callback(error)
                  callback(null, account)
                })
              })
            case securePassword.VALID:
              return callback(null, account)
            /* istanbul ignore next */
            default:
              var otherError = new Error(
                'unexpected password hash result: ' + result
              )
              otherError.statusCode = 500
              return callback(otherError)
          }
        }
      )
    })
  })
}
