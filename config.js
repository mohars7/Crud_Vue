const PORT = process.env.PORT || 3000
const JWT_SECRET = process.env.JWT_SECRET || 'canvia-aquest-secret-en-produccio'
const TOKEN_EXPIRES_IN = '1h'
const COOKIE_NAME = 'access_token'

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 1000 * 60 * 60,
}

module.exports = { PORT, JWT_SECRET, TOKEN_EXPIRES_IN, COOKIE_NAME, COOKIE_OPTIONS }
