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

    // Обработка сообщений от клиента
    socket.on('chat message', (msg) => {
        console.log('Сообщение:', msg);
        // Отправляем сообщение всем подключенным клиентам
        io.emit('chat message', msg);
    });

    // === НОВЫЕ СОБЫТИЯ ДЛЯ РИСОВАНИЯ ===
    
    // Обработка начала рисования
    socket.on('draw start', (data) => {
        console.log('Начало рисования от', socket.id, data);
        // Отправляем всем остальным пользователям
        socket.broadcast.emit('draw start', data);
    });

    // Обработка продолжения рисования
    socket.on('draw continue', (data) => {
        console.log('Продолжение рисования от', socket.id);
        // Отправляем всем остальным пользователям
        socket.broadcast.emit('draw continue', data);
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
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});