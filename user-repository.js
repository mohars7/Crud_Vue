const bcrypt = require('bcrypt')
const Repository = require('./repository')

const SALT_ROUNDS = 10

const users = new Repository('users.json')
const resources = new Repository('resources.json')
const bookings = new Repository('bookings.json')
const notifications = new Repository('notifications.json')

function publicUser(user) {
  if (!user) return null
  const { password, ...rest } = user
  return rest
}

class UserRepository {
  static async create({ username, email, password, role = 'user' }) {
    const hash = await bcrypt.hash(password, SALT_ROUNDS)
    return users.create({
      username,
      email,
      password: hash,
      role,
      createdAt: new Date().toISOString(),
    })
  }

  static async update(id, { username, email, password, role }) {
    const changes = {}
    if (username !== undefined) changes.username = username
    if (email !== undefined) changes.email = email
    if (role !== undefined) changes.role = role
    if (password !== undefined) changes.password = await bcrypt.hash(password, SALT_ROUNDS)
    return users.update(id, changes)
  }

  static async login(identifier, password) {
    const user = users.findOne(
      (u) => u.username === identifier || u.email === identifier
    )
    if (!user) return null
    const ok = await bcrypt.compare(password, user.password)
    return ok ? user : null
  }

  static findById(id) {
    return users.findById(id)
  }

  static findByUsername(username) {
    return users.findOne((u) => u.username === username)
  }

  static findByEmail(email) {
    return users.findOne((u) => u.email === email)
  }

  static all() {
    return users.all()
  }

  static remove(id) {
    return users.remove(id)
  }
}

module.exports = {
  UserRepository,
  publicUser,
  users,
  resources,
  bookings,
  notifications,
}
