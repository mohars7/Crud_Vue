const fs = require('fs')
const path = require('path')

class Repository {
  constructor(fileName) {
    this.file = path.join(__dirname, 'db', fileName)
    if (!fs.existsSync(this.file)) this.save([])
  }

  load() {
    return JSON.parse(fs.readFileSync(this.file, 'utf-8'))
  }

  save(items) {
    fs.writeFileSync(this.file, JSON.stringify(items, null, 2))
  }

  all() {
    return this.load()
  }

  findById(id) {
    return this.load().find((item) => item.id === Number(id))
  }

  find(predicate) {
    return this.load().filter(predicate)
  }

  findOne(predicate) {
    return this.load().find(predicate)
  }

  create(data) {
    const items = this.load()
    const id = items.reduce((max, item) => Math.max(max, item.id), 0) + 1
    const item = { id, ...data }
    items.push(item)
    this.save(items)
    return item
  }

  update(id, data) {
    const items = this.load()
    const index = items.findIndex((item) => item.id === Number(id))
    if (index === -1) return null
    items[index] = { ...items[index], ...data, id: items[index].id }
    this.save(items)
    return items[index]
  }

  remove(id) {
    const items = this.load()
    const index = items.findIndex((item) => item.id === Number(id))
    if (index === -1) return false
    items.splice(index, 1)
    this.save(items)
    return true
  }
}

module.exports = Repository
