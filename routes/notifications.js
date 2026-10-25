const express = require('express')
const { notifications, users } = require('../user-repository')
const { requireAuth, requireRole, isAdmin } = require('../middleware/auth')

const router = express.Router()

router.use(requireAuth)

const canManage = (req, notification) =>
  isAdmin(req.session.user) || notification.userId === req.session.user.id

router.get('/', (req, res) => {
  const list = isAdmin(req.session.user)
    ? notifications.all()
    : notifications.find((n) => n.userId === req.session.user.id)
  res.json(list)
})

router.get('/:id', (req, res) => {
  const notification = notifications.findById(req.params.id)
  if (!notification) return res.status(404).json({ error: 'Notificació no trobada' })
  if (!canManage(req, notification)) {
    return res.status(403).json({ error: 'No tens permisos per veure aquesta notificació' })
  }
  res.json(notification)
})

router.post('/', requireRole('admin'), (req, res) => {
  const { userId, message } = req.body || {}
  const errors = []
  if (!users.findById(userId)) errors.push('L\'usuari destinatari no existeix')
  if (typeof message !== 'string' || message.trim().length < 1) {
    errors.push('El missatge no pot estar buit')
  }
  if (errors.length) return res.status(400).json({ errors })

  const notification = notifications.create({
    userId: Number(userId),
    message: message.trim(),
    read: false,
    createdAt: new Date().toISOString(),
  })
  res.status(201).json(notification)
})

router.put('/:id', (req, res) => {
  const notification = notifications.findById(req.params.id)
  if (!notification) return res.status(404).json({ error: 'Notificació no trobada' })
  if (!canManage(req, notification)) {
    return res.status(403).json({ error: 'No tens permisos per modificar aquesta notificació' })
  }

  const { read, message } = req.body || {}
  const errors = []
  if (read !== undefined && typeof read !== 'boolean') errors.push('"read" ha de ser true o false')
  if (message !== undefined) {
    if (!isAdmin(req.session.user)) {
      return res.status(403).json({ error: 'Només un administrador pot canviar el missatge' })
    }
    if (typeof message !== 'string' || message.trim().length < 1) {
      errors.push('El missatge no pot estar buit')
    }
  }
  if (errors.length) return res.status(400).json({ errors })

  const changes = {}
  if (read !== undefined) changes.read = read
  if (message !== undefined) changes.message = message.trim()
  res.json(notifications.update(notification.id, changes))
})

router.delete('/:id', (req, res) => {
  const notification = notifications.findById(req.params.id)
  if (!notification) return res.status(404).json({ error: 'Notificació no trobada' })
  if (!canManage(req, notification)) {
    return res.status(403).json({ error: 'No tens permisos per eliminar aquesta notificació' })
  }
  notifications.remove(notification.id)
  res.json({ message: 'Notificació eliminada' })
})

module.exports = router
