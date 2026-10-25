const express = require('express')
const { bookings, resources, notifications, users } = require('../user-repository')
const { requireAuth, isAdmin } = require('../middleware/auth')
const { isValidDate } = require('../validators')

const router = express.Router()

router.use(requireAuth)

const canManage = (req, booking) =>
  isAdmin(req.session.user) || booking.userId === req.session.user.id

function overlaps(resourceId, start, end, ignoreId = null) {
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  return bookings.findOne(
    (b) =>
      b.resourceId === resourceId &&
      b.id !== ignoreId &&
      s < new Date(b.end).getTime() &&
      new Date(b.start).getTime() < e
  )
}

function notify(userId, message) {
  notifications.create({
    userId,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  })
}

function validateDates(start, end) {
  const errors = []
  if (!isValidDate(start)) errors.push('La data d\'inici no és vàlida (format ISO 8601)')
  if (!isValidDate(end)) errors.push('La data de final no és vàlida (format ISO 8601)')
  if (!errors.length) {
    if (new Date(start) >= new Date(end)) errors.push('La data d\'inici ha de ser anterior a la de final')
    else if (new Date(start) < new Date()) errors.push('No es poden fer reserves en el passat')
  }
  return errors
}

router.get('/', (req, res) => {
  const list = isAdmin(req.session.user)
    ? bookings.all()
    : bookings.find((b) => b.userId === req.session.user.id)
  res.json(list)
})

router.get('/:id', (req, res) => {
  const booking = bookings.findById(req.params.id)
  if (!booking) return res.status(404).json({ error: 'Reserva no trobada' })
  if (!canManage(req, booking)) {
    return res.status(403).json({ error: 'No tens permisos per veure aquesta reserva' })
  }
  res.json(booking)
})

router.post('/', (req, res) => {
  const { resourceId, start, end, userId } = req.body || {}
  const errors = validateDates(start, end)

  const resource = resources.findById(resourceId)
  if (!resource) errors.push('El recurs indicat no existeix')

  let ownerId = req.session.user.id
  if (userId !== undefined) {
    if (!isAdmin(req.session.user)) {
      return res.status(403).json({ error: 'Només un administrador pot reservar en nom d\'un altre usuari' })
    }
    if (!users.findById(userId)) errors.push('L\'usuari indicat no existeix')
    ownerId = Number(userId)
  }
  if (errors.length) return res.status(400).json({ errors })

  if (overlaps(resource.id, start, end)) {
    return res.status(409).json({ error: 'El recurs ja està reservat en aquest horari' })
  }

  const booking = bookings.create({
    resourceId: resource.id,
    userId: ownerId,
    start,
    end,
    createdAt: new Date().toISOString(),
  })
  notify(ownerId, `Reserva #${booking.id} confirmada per a "${resource.name}"`)
  res.status(201).json(booking)
})

router.put('/:id', (req, res) => {
  const booking = bookings.findById(req.params.id)
  if (!booking) return res.status(404).json({ error: 'Reserva no trobada' })
  if (!canManage(req, booking)) {
    return res.status(403).json({ error: 'No tens permisos per modificar aquesta reserva' })
  }

  const start = req.body?.start ?? booking.start
  const end = req.body?.end ?? booking.end
  const resourceId = req.body?.resourceId ?? booking.resourceId

  const errors = validateDates(start, end)
  const resource = resources.findById(resourceId)
  if (!resource) errors.push('El recurs indicat no existeix')
  if (errors.length) return res.status(400).json({ errors })

  if (overlaps(resource.id, start, end, booking.id)) {
    return res.status(409).json({ error: 'El recurs ja està reservat en aquest horari' })
  }

  const updated = bookings.update(booking.id, { resourceId: resource.id, start, end })
  notify(booking.userId, `Reserva #${booking.id} modificada per a "${resource.name}"`)
  res.json(updated)
})

router.delete('/:id', (req, res) => {
  const booking = bookings.findById(req.params.id)
  if (!booking) return res.status(404).json({ error: 'Reserva no trobada' })
  if (!canManage(req, booking)) {
    return res.status(403).json({ error: 'No tens permisos per eliminar aquesta reserva' })
  }
  bookings.remove(booking.id)
  notify(booking.userId, `Reserva #${booking.id} cancel·lada`)
  res.json({ message: 'Reserva eliminada' })
})

module.exports = router
