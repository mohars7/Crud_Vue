const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/

function validateUserData({ username, email, password }, { partial = false } = {}) {
  const errors = []

  if (!partial || username !== undefined) {
    if (typeof username !== 'string' || !USERNAME_REGEX.test(username)) {
      errors.push('El nom d\'usuari ha de tenir entre 3 i 30 caràcters (lletres, números o _)')
    }
  }
  if (!partial || email !== undefined) {
    if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      errors.push('El correu electrònic no és vàlid')
    }
  }
  if (!partial || password !== undefined) {
    if (typeof password !== 'string' || password.length < 8) {
      errors.push('La contrasenya ha de tenir almenys 8 caràcters')
    }
  }
  return errors
}

function isValidDate(value) {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime())
}

module.exports = { validateUserData, isValidDate }
