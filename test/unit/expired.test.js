import tap from 'tap'
import { token as tokenExpired } from '../../expired.js'

tap.test('expired unknown token', test => {
  const token = {
    action: 'invalid action',
    created: new Date().toISOString()
  }
  test.strictEqual(tokenExpired(token), false, 'returns false')
  test.end()
})
