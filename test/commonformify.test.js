const cfCommonMark = require('commonform-commonmark')
const commonformify = require('../commonformify')
const fs = require('fs')
const tape = require('tape')
const path = require('path')

tape('commonformify', test => {
  fs.readFile(
    path.join(__dirname, '..', 'terms', 'paid.md'),
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
