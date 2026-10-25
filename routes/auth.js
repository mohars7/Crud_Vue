const express = require('express')
const jwt = require('jsonwebtoken')
const {
  JWT_SECRET,
  TOKEN_EXPIRES_IN,
  COOKIE_NAME,
  COOKIE_OPTIONS,
} = require('../config')
const { UserRepository, publicUser, bookings, notifications, resources } = require('../user-repository')
const { validateUserData } = require('../validators')
const { requireLogin } = require('../middleware/auth')

const router = express.Router()

const wantsJson = (req) =>
  (req.get('Content-Type') || '').includes('application/json') ||
  (req.get('Accept') || '').includes('application/json')

router.get('/', (req, res) => {
  res.render('index', { user: req.session.user })
})

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/protected')
  res.render('login', { error: null, message: null, user: null })
})

router.get('/register', (req, res) => {
  res.redirect('/login')
})

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body || {}
  const errors = validateUserData({ username, email, password })

  if (!errors.length && UserRepository.findByUsername(username)) {
    errors.push('Aquest nom d\'usuari ja existeix')
  }
  if (!errors.length && UserRepository.findByEmail(email)) {
    errors.push('Aquest correu electrònic ja està registrat')
  }

  if (errors.length) {
    if (wantsJson(req)) return res.status(400).json({ errors })
    return res.status(400).render('login', { error: errors.join('. '), message: null, user: null })
  }

  const user = await UserRepository.create({ username, email, password })

  if (wantsJson(req)) {
    return res.status(201).json({ message: 'Usuari registrat correctament', user: publicUser(user) })
  }
  res.status(201).render('login', {
    error: null,
    message: 'Registre correcte. Ja pots iniciar sessió.',
    user: null,
  })
})

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {}

  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    const error = 'Cal indicar usuari i contrasenya'
    if (wantsJson(req)) return res.status(400).json({ error })
    return res.status(400).render('login', { error, message: null, user: null })
  }

  const user = await UserRepository.login(username, password)
  if (!user) {
    const error = 'Credencials incorrectes'
    if (wantsJson(req)) return res.status(401).json({ error })
    return res.status(401).render('login', { error, message: null, user: null })
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN }
  )
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS)

  if (wantsJson(req)) {
    return res.json({ message: 'Sessió iniciada', user: publicUser(user) })
  }
  res.redirect('/protected')
})

function logout(req, res) {
  res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTIONS, maxAge: undefined })
  if (wantsJson(req)) return res.json({ message: 'Sessió tancada' })
  res.redirect('/')
}
router.post('/logout', logout)
router.get('/logout', logout)

router.get('/protected', requireLogin, (req, res) => {
  const me = req.session.user
  const myBookings = bookings.find((b) => b.userId === me.id).map((b) => ({
    ...b,
    resource: resources.findById(b.resourceId),
  }))
  const myNotifications = notifications.find((n) => n.userId === me.id)
  res.render('protected', { user: me, bookings: myBookings, notifications: myNotifications })
})

router.get('/profile', requireLogin, (req, res) => {
  const full = UserRepository.findById(req.session.user.id)
  if (!full) {
    res.clearCookie(COOKIE_NAME)
    return res.redirect('/login')
  }
  res.render('profile', { user: req.session.user, profile: publicUser(full) })
})

module.exports = router
