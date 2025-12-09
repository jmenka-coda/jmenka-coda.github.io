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

app.get('/rooms', function(req, res) {
    res.sendFile(__dirname + '/rooms.html');
});

// API эндпоинт для получения списка комнат
app.get('/api/rooms', function(req, res) {
    const rooms = [];

    // Обновляем счетчики пользователей для всех комнат
    for (const [roomName, state] of roomStates) {
        const room = io.sockets.adapter.rooms.get(roomName);
        const userCount = room ? room.size : 0;
        state.userCount = userCount;

        if (userCount > 0 || state.strokes.length > 0) {
            rooms.push({
                name: roomName,
                userCount: userCount,
                strokeCount: state.strokes.length
            });
        }
    }

    // Удаляем пустые комнаты
    for (const [roomName, state] of roomStates) {
        if (state.userCount === 0 && state.strokes.length === 0) {
            roomStates.delete(roomName);
        }
    }

    res.json({ rooms });
});

// Хранилище состояния комнат: roomName -> { strokes: [...], userCount: number }
const roomStates = new Map();

// Функция для получения состояния комнаты
function getRoomState(roomName) {
    if (!roomStates.has(roomName)) {
        roomStates.set(roomName, { strokes: [], userCount: 0 });
    }
    return roomStates.get(roomName);
}

// Функция для обновления счетчика пользователей в комнате
function updateRoomUserCount(roomName) {
    const room = io.sockets.adapter.rooms.get(roomName);
    const userCount = room ? room.size : 0;
    const state = getRoomState(roomName);
    state.userCount = userCount;

    // Если в комнате нет пользователей и нет штрихов, удаляем состояние комнаты
    if (userCount === 0 && (!state.strokes || state.strokes.length === 0)) {
        roomStates.delete(roomName);
    }
}

// Функция для добавления штриха в состояние комнаты
function addStrokeToRoom(roomName, userId, strokeId, color, size, points) {
    const state = getRoomState(roomName);
    const stroke = {
        userId,
        strokeId,
        color,
        size,
        points: points || []
    };
    state.strokes.push(stroke);
}

// Функция для обновления штриха в состоянии комнаты
function updateStrokeInRoom(roomName, userId, strokeId, point) {
    const state = getRoomState(roomName);
    const stroke = state.strokes.find(s => s.userId === userId && s.strokeId === strokeId);
    if (stroke && point) {
        stroke.points.push({ x: point.x, y: point.y });
    }
}

// Функция для удаления штриха из состояния комнаты
function removeStrokeFromRoom(roomName, userId, strokeId) {
    const state = getRoomState(roomName);
    const index = state.strokes.findIndex(s => s.userId === userId && s.strokeId === strokeId);
    if (index !== -1) {
        state.strokes.splice(index, 1);
    }
}

io.on('connection', (socket) => {
    console.log('Новый пользователь подключился:', socket.id);

    let currentRoom = 'default';
    socket.join(currentRoom);

    socket.on('join room', (payload = {}) => {
        const requestedRoom = (payload.room || 'default').trim() || 'default';

        if (currentRoom) {
            socket.leave(currentRoom);
            updateRoomUserCount(currentRoom);
        }

        currentRoom = requestedRoom;
        socket.join(currentRoom);
        updateRoomUserCount(currentRoom);
        console.log(`Пользователь ${socket.id} присоединился к комнате ${currentRoom}`);
        socket.emit('room joined', { room: currentRoom });

        // Отправляем состояние комнаты новому пользователю
        const state = getRoomState(currentRoom);
        socket.emit('room state', { strokes: state.strokes });
    });

    socket.on('get rooms', () => {
        const rooms = [];

        // Обновляем счетчики пользователей для всех комнат
        for (const [roomName, state] of roomStates) {
            const room = io.sockets.adapter.rooms.get(roomName);
            const userCount = room ? room.size : 0;
            state.userCount = userCount;

            if (userCount > 0 || state.strokes.length > 0) {
                rooms.push({
                    name: roomName,
                    userCount: userCount,
                    strokeCount: state.strokes.length
                });
            }
        }

        socket.emit('rooms list', { rooms });
    });

    socket.on('request room state', (payload = {}) => {
        const room = (payload.room || currentRoom || 'default').trim() || 'default';
        const state = getRoomState(room);
        socket.emit('room state', { strokes: state.strokes });
    });

    socket.on('draw start', (data) => {
        const room = currentRoom || 'default';
        console.log('Начало рисования от', socket.id, data, 'в комнате', room);
        
        // Сохраняем начало штриха в состояние комнаты
        if (data && data.x !== undefined && data.y !== undefined) {
            addStrokeToRoom(room, socket.id, data.strokeId, data.color, data.size, [{ x: data.x, y: data.y }]);
        }
        
        socket.to(room).emit('draw start', { data, userId: socket.id});
    });

    socket.on('draw continue', (data) => {
        const room = currentRoom || 'default';
        console.log('Продолжение рисования от', socket.id, 'в комнате', room);
        
        // Обновляем штрих в состоянии комнаты
        if (data && data.x !== undefined && data.y !== undefined) {
            updateStrokeInRoom(room, socket.id, data.strokeId, { x: data.x, y: data.y });
        }
        
        socket.to(room).emit('draw continue', { data, userId: socket.id});
    });

    socket.on('draw end', (data) => {
        const room = currentRoom || 'default';
        console.log('Завершение рисования от', socket.id, 'в комнате', room);
        
        // Штрих завершен, но остается в состоянии комнаты для других пользователей
        // Удаление из remoteStrokes на клиенте - это просто для очистки временных данных
        
        socket.to(room).emit('draw end', { data, userId: socket.id});
    });

    socket.on('clear canvas', () => {
        const room = currentRoom || 'default';
        console.log('Очистка canvas от', socket.id, 'в комнате', room);
        
        // Очищаем состояние комнаты
        const state = getRoomState(room);
        state.strokes = [];
        
        socket.to(room).emit('clear canvas');
        // Также отправляем себе, чтобы синхронизировать
        socket.emit('clear canvas');
    });

    socket.on('disconnect', () => {
        console.log('Пользователь отключился:', socket.id);
        // Обновляем счетчик пользователей в комнате при отключении
        if (currentRoom) {
            updateRoomUserCount(currentRoom);
        }
    });
});

const PORT = 4000;
let HOST = ['localhost', '192.168.1.103'];

server.listen(PORT, HOST[0], () => {
    console.log(` Сервер  запущен ${PORT[0]}`);
});