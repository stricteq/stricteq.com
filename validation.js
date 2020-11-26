// Validate user inputs.

// Account Names
exports.handles = (() => {
  const pattern = '[a-z0-9]{3,16}'
  const re = new RegExp(`^${pattern}$`)
  return {
    pattern,
    validate: string => re.test(string),
    html: 'Handles must be ' +
      'made of the characters ‘a’ through ‘z’ ' +
      'and the digits ‘0’ through ‘9’. ' +
      'They must be at least three characters long, ' +
      'but no more than sixteen.'
  }
})()

// Project Names
exports.projects = (() => {
  const pattern = '[a-z0-9]{3,16}'
  const re = new RegExp(`^${pattern}$`)
  return {
    pattern,
    validate: string => re.test(string),
    html: 'Project names must be ' +
      'made of the characters ‘a’ through ‘z’ ' +
      'and the digits ‘0’ through ‘9’. ' +
      'They must be at least three characters long, ' +
      'but no more than sixteen.'
  }
})()

// Passwords
exports.passwords = (() => {
  const min = 8
  const max = 64
  const pattern = exports.pattern = `.{${min},${max}}`
  const re = new RegExp(`^${pattern}$`)
  return {
    pattern,
    validate: string => {
      if (!re.test(string)) return false
      const length = string.length
      return length >= min && length <= max
    },
    html: 'Passwords must be ' +
      `at least ${min} characters, ` +
      `and no more than ${max}.`
  }
})()
