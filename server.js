const express = require('express')
const cookieParser = require('cookie-parser')
const path = require('path')
const { PORT } = require('./config')
const { loadSession } = require('./middleware/auth')

const authRoutes = require('./routes/auth')
const usersRoutes = require('./routes/users')
const resourcesRoutes = require('./routes/resources')
const bookingsRoutes = require('./routes/bookings')
const notificationsRoutes = require('./routes/notifications')

const app = express()

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))
app.disable('x-powered-by')

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))
app.use(loadSession)

app.use('/', authRoutes)
app.use('/users', usersRoutes)
app.use('/resources', resourcesRoutes)
app.use('/bookings', bookingsRoutes)
app.use('/notifications', notificationsRoutes)

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no trobada' })
})

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cos de la petició no és un JSON vàlid' })
  }
  console.error(err)
  res.status(500).json({ error: 'Error intern del servidor' })
})

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor escoltant a http://localhost:${PORT}`)
  })
}

module.exports = app
