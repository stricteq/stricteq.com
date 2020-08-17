// Environment Variable Parsing and Validation

const spawnSync = require('child_process').spawnSync

const variables = [
  { name: 'PUBLIC_KEY', required: true },
  { name: 'PRIVATE_KEY', required: true },
  { name: 'BASE_HREF', required: true },
  { name: 'CSRF_KEY', required: true },
  { name: 'DIRECTORY', required: true },
  { name: 'MINIMUM_COMMISSION', required: true },
  { name: 'STRIPE_CLIENT_ID', required: true },
  { name: 'STRIPE_SECRET_KEY', required: true },
  { name: 'STRIPE_PUBLISHABLE_KEY', required: true }
]

const programs = ['pandoc', 'pdflatex']

module.exports = () => {
  // Environment Variables
  const returned = { missingVariables: [], missingPrograms: [] }
  variables.forEach(variable => {
    const name = variable.name
    const value = process.env[name]
    if (!value) returned.variables.push(name)
    else returned[name] = value
  })
  returned.MINIMUM_COMMISSION = parseInt(returned.MINIMUM_COMMISSION)
  if (isNaN(returned.MINIMUM_COMMISSION)) {
    returned.variables.push('MINIMUM_COMMISSION')
  }
  returned.production = process.env.NODE_ENV === 'production'

  // External Programs
  programs.forEach(program => {
    if (spawnSync('which', [program]).status !== 0) {
      returned.missingPrograms.push(program)
    }
  })

  return returned
}

if (!module.parent) {
  module.exports()
}
