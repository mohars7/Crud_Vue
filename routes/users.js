const express = require('express')
const { UserRepository, publicUser } = require('../user-repository')
const { requireAuth, requireRole, isAdmin } = require('../middleware/auth')
const { validateUserData } = require('../validators')

const router = express.Router()

router.use(requireAuth)

const canAccess = (req, id) => isAdmin(req.session.user) || req.session.user.id === Number(id)

router.get('/', requireRole('admin'), (req, res) => {
  res.json(UserRepository.all().map(publicUser))
})

router.get('/:id', (req, res) => {
  if (!canAccess(req, req.params.id)) {
    return res.status(403).json({ error: 'No tens permisos per veure aquest usuari' })
  }
  const user = UserRepository.findById(req.params.id)
  if (!user) return res.status(404).json({ error: 'Usuari no trobat' })
  res.json(publicUser(user))
})

router.post('/', requireRole('admin'), async (req, res) => {
  const { username, email, password, role = 'user' } = req.body || {}
  const errors = validateUserData({ username, email, password })
  if (!['user', 'admin'].includes(role)) errors.push('El rol ha de ser "user" o "admin"')
  if (!errors.length && UserRepository.findByUsername(username)) {
    return res.status(409).json({ error: 'Aquest nom d\'usuari ja existeix' })
  }
  if (!errors.length && UserRepository.findByEmail(email)) {
    return res.status(409).json({ error: 'Aquest correu electrònic ja està registrat' })
  }
  if (errors.length) return res.status(400).json({ errors })

  const user = await UserRepository.create({ username, email, password, role })
  res.status(201).json(publicUser(user))
})

router.put('/:id', async (req, res) => {
  if (!canAccess(req, req.params.id)) {
    return res.status(403).json({ error: 'No tens permisos per modificar aquest usuari' })
  }
  const existing = UserRepository.findById(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Usuari no trobat' })

  const { username, email, password, role } = req.body || {}
  const errors = validateUserData({ username, email, password }, { partial: true })

  if (role !== undefined) {
    if (!isAdmin(req.session.user)) {
      return res.status(403).json({ error: 'Només un administrador pot canviar el rol' })
    }
    if (!['user', 'admin'].includes(role)) errors.push('El rol ha de ser "user" o "admin"')
  }
  if (errors.length) return res.status(400).json({ errors })

  if (username !== undefined) {
    const other = UserRepository.findByUsername(username)
    if (other && other.id !== existing.id) {
      return res.status(409).json({ error: 'Aquest nom d\'usuari ja existeix' })
    }
  }
  if (email !== undefined) {
    const other = UserRepository.findByEmail(email)
    if (other && other.id !== existing.id) {
      return res.status(409).json({ error: 'Aquest correu electrònic ja està registrat' })
    }
  }

  const updated = await UserRepository.update(req.params.id, { username, email, password, role })
  res.json(publicUser(updated))
})

router.delete('/:id', requireRole('admin'), (req, res) => {
  if (req.session.user.id === Number(req.params.id)) {
    return res.status(400).json({ error: 'No pots eliminar el teu propi usuari' })
  }
  const removed = UserRepository.remove(req.params.id)
  if (!removed) return res.status(404).json({ error: 'Usuari no trobat' })
  res.json({ message: 'Usuari eliminat' })
})

module.exports = router
