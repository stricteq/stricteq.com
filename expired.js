// Expiration Policies

export const csrfToken = s => expired(s, days(7))
export const accountLock = s => expired(s, days(1))
export const changeEMailToken = s => expired(s, hours(1))
export const confirmEMailToken = s => expired(s, days(1))
export const resetPasswordToken = s => expired(s, hours(1))

const actionToExpiration = {
  'confirm e-mail': confirmEMailToken,
  'change e-mail': changeEMailToken,
  'reset password': resetPasswordToken
}

export const token = (token) => {
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

function expired (dateString, lifetime) {
  const now = Date.now()
  const date = Date.parse(dateString)
  return (now - date) > lifetime // days * 24 * 60 * 60 * 1000
}
