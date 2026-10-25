const jwt = require('jsonwebtoken')
const { JWT_SECRET, COOKIE_NAME } = require('../config')

function loadSession(req, res, next) {
  req.session = { user: null }

  const header = req.get('Authorization') || ''
  const token = req.cookies[COOKIE_NAME] || (header.startsWith('Bearer ') ? header.slice(7) : null)

  if (token) {
    try {
      const data = jwt.verify(token, JWT_SECRET)
      req.session.user = { id: data.id, username: data.username, role: data.role }
    } catch (err) {
      req.session.user = null
    }
  }
  next()
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Cal estar autenticat per accedir a aquest recurs' })
  }
  next()
}

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login')
  next()
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Cal estar autenticat per accedir a aquest recurs' })
    }
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ error: 'No tens permisos per fer aquesta acció' })
    }
    next()
  }
}

function isAdmin(user) {
  return user && user.role === 'admin'
}

module.exports = { loadSession, requireAuth, requireLogin, requireRole, isAdmin }
