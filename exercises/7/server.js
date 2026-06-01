const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const path = require('path')

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id)

    socket.on('objectMove', (data) => {
        socket.broadcast.emit('objectMove', {
            id: socket.id,
            position: data.position,
            rotation: data.rotation
        })
    })

    socket.on('colorChange', (data) => {
        socket.broadcast.emit('colorChange', {
            id: socket.id,
            color: data.color
        })
    })

    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id)
        io.emit('playerDisconnected', socket.id)
    })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`)
})
