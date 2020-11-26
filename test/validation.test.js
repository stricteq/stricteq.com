const tape = require('tape')
const validation = require('../validation')

tape('handle validation', test => {
  test.assert(validation.handles.validate('kemitchell'))
  test.assert(validation.handles.validate('ten10'))
  test.end()
})

tape('project name validation', test => {
  test.assert(validation.projects.validate('superlibrary'))
  test.assert(validation.projects.validate('framework10'))
  test.end()
})

tape('password validation', test => {
  test.assert(validation.passwords.validate('not a very secure one'))
  test.assert(validation.passwords.validate('feeth~ohHie1'))
  test.end()
})
