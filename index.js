const express = require('express');
const http = require('http');
const socketIo = require('socket.io');


const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('Новый пользователь подключился:', socket.id);
 
    socket.on('draw start', (data) => {
        console.log('Начало рисования от', socket.id, data);
        socket.broadcast.emit('draw start', { data, userId: socket.id});
    });

    socket.on('draw continue', (data) => {
        console.log('Продолжение рисования от', socket.id);
        socket.broadcast.emit('draw continue', { data, userId: socket.id});
    });

    socket.on('draw end', (data) => {
        console.log('Продолжение рисования от', socket.id);
        socket.broadcast.emit('draw end', { data, userId: socket.id});
    });

    socket.on('clear canvas', () => {
        console.log('Очистка canvas от', socket.id);
        socket.broadcast.emit('clear canvas');
    });

    socket.on('disconnect', () => {
        console.log('Пользователь отключился:', socket.id);
    });
});

const PORT = 4000;
let HOST = 'localhost';
HOST =  '192.168.1.103'

server.listen(PORT, HOST, () => {
    console.log(` Сервер  запущен ${PORT}`);
});