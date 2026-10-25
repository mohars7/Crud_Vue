const express = require('express')
const { resources, bookings } = require('../user-repository')
const { requireAuth, requireRole } = require('../middleware/auth')

const router = express.Router()

router.use(requireAuth)

function validateResource({ name, description, capacity }, { partial = false } = {}) {
  const errors = []
  if (!partial || name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2) {
      errors.push('El nom del recurs ha de tenir almenys 2 caràcters')
    }
  }
  if (description !== undefined && typeof description !== 'string') {
    errors.push('La descripció ha de ser text')
  }
  if (!partial || capacity !== undefined) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      errors.push('La capacitat ha de ser un enter major que 0')
    }
  }
  return errors
}

router.get('/', (req, res) => {
  res.json(resources.all())
})

router.get('/:id', (req, res) => {
  const resource = resources.findById(req.params.id)
  if (!resource) return res.status(404).json({ error: 'Recurs no trobat' })
  res.json(resource)
})

router.post('/', requireRole('admin'), (req, res) => {
  const { name, description = '', capacity } = req.body || {}
  const errors = validateResource({ name, description, capacity })
  if (errors.length) return res.status(400).json({ errors })

  const resource = resources.create({
    name: name.trim(),
    description,
    capacity,
    createdBy: req.session.user.id,
    createdAt: new Date().toISOString(),
  })
  res.status(201).json(resource)
})

router.put('/:id', requireRole('admin'), (req, res) => {
  if (!resources.findById(req.params.id)) {
    return res.status(404).json({ error: 'Recurs no trobat' })
  }
  const { name, description, capacity } = req.body || {}
  const errors = validateResource({ name, description, capacity }, { partial: true })
  if (errors.length) return res.status(400).json({ errors })

  const changes = {}
  if (name !== undefined) changes.name = name.trim()
  if (description !== undefined) changes.description = description
  if (capacity !== undefined) changes.capacity = capacity
  res.json(resources.update(req.params.id, changes))
})

router.delete('/:id', requireRole('admin'), (req, res) => {
  if (!resources.findById(req.params.id)) {
    return res.status(404).json({ error: 'Recurs no trobat' })
  }
  const hasBookings = bookings.find((b) => b.resourceId === Number(req.params.id)).length > 0
  if (hasBookings) {
    return res.status(409).json({ error: 'No es pot eliminar un recurs que té reserves' })
  }
  resources.remove(req.params.id)
  res.json({ message: 'Recurs eliminat' })
})

module.exports = router
