// Expiration Policies

exports.csrfToken = s => expired({ s, lifetime: days(7) })
exports.accountLock = s => expired({ s, lifetime: days(1) })
exports.changeEMailToken = s => expired({ s, lifetime: hours(1) })
exports.confirmEMailToken = s => expired({ s, lifetime: days(1) })
exports.resetPasswordToken = s => expired({ s, lifetime: hours(1) })

const actionToExpiration = {
  'confirm e-mail': exports.confirmEMailToken,
  'change e-mail': exports.changeEMailToken,
  'reset password': exports.resetPasswordToken
}

exports.token = (token) => {
  const predicate = actionToExpiration[token.action]
  if (!predicate) return false
  return predicate(token.created)
}

function days (days) {
  return days * hours(24)
}

function hours (hours) {
  return hours * 60 * 60 * 1000
}

function expired ({ dateString, lifetime }) {
  const now = Date.now()
  const date = Date.parse(dateString)
  return (now - date) > lifetime // days * 24 * 60 * 60 * 1000
}
