// Validate user inputs.

const alnum = '[a-z0-9]'

// Account Names
exports.handles = (() => {
  const pattern = `${alnum}(?:${alnum}|[-_](?=${alnum})){0,38}`
  const re = new RegExp(`^${pattern}$`)
  return {
    pattern,
    validate: string => re.test(string),
    html: 'Handles must be ' +
      'made of the characters ‘a’ through ‘z’, ' +
      'the digits ‘0’ through ‘9’, ' +
      'hyphens, and underscores.' +
      'They must be at least three characters long, ' +
      'but no more than thirty-eight.' +
      'Handles can’t start with hypens or underscores, ' +
      'and two hyphens or underscores can’t appear in a row.'
  }
})()

// Project Names
exports.projects = (() => {
  const pattern = '[a-z0-9-_]{1,64}'
  const re = new RegExp(`^${pattern}$`)
  return {
    pattern,
    validate: string => re.test(string),
    html: 'Project names must be ' +
      'made of the characters ‘a’ through ‘z’, ' +
      'the digits ‘0’ through ‘9’, ' +
      'hyphens, and underscores.'
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
