const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Обслуживание статических файлов
app.use(express.static('public'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

// Обработка подключений Socket.IO
io.on('connection', (socket) => {
    console.log('Новый пользователь подключился:', socket.id);
 
    // Обработка начала рисования
    socket.on('draw start', (data) => {
        console.log('Начало рисования от', socket.id, data);
        // Отправляем всем остальным пользователям
        socket.broadcast.emit('draw start', { data, userId: socket.id});
    });

    // Обработка продолжения рисования
    socket.on('draw continue', (data) => {
        console.log('Продолжение рисования от', socket.id);
        // Отправляем всем остальным пользователям
        socket.broadcast.emit('draw continue', { data, userId: socket.id});
    });

    socket.on('draw end', (data) => {
        console.log('Продолжение рисования от', socket.id);
        // Отправляем всем остальным пользователям
        socket.broadcast.emit('draw end', { data, userId: socket.id});
    });

    // Обработка очистки canvas
    socket.on('clear canvas', () => {
        console.log('Очистка canvas от', socket.id);
        // Отправляем всем остальным пользователям
        socket.broadcast.emit('clear canvas');
    });

    // Обработка отключения
    socket.on('disconnect', () => {
        console.log('Пользователь отключился:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, 'localhost', () => {
    console.log(` Сервер  запущен ${PORT}`);
});