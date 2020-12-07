import cfCommonMark from 'commonform-commonmark'
import commonformify from '../../commonformify.js'
import fs from 'fs'
import tap from 'tap'
import path from 'path'

tap.test('commonformify', test => {
  fs.readFile(
    path.join('terms', 'paid', '1.0.0.md'),
    'utf8',
    (error, read) => {
      test.ifError(error, 'read error')
      const processed = commonformify(read)
      test.doesNotThrow(() => {
        cfCommonMark.parse(processed)
      }, 'parses')
      test.end()
    }
  )
})
