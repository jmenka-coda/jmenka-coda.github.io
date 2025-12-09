/**
 * Обработчик Socket.IO событий
 */

const roomManager = require('../rooms/roomManager');

/**
 * Настраивает обработчики Socket.IO событий
 * @param {Object} io - Socket.IO сервер
 */
function setupSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log('Новый пользователь подключился:', socket.id);

        let currentRoom = 'default';
        socket.join(currentRoom);

        // Создание комнаты (просто инициализирует комнату без присоединения)
        socket.on('create room', (payload = {}) => {
            const roomName = (payload.room || '').trim();
            if (roomName) {
                roomManager.getRoomState(roomName); // Создает комнату в памяти
                console.log(`Комната ${roomName} инициализирована`);
            }
        });

        // Присоединение к комнате
        socket.on('join room', (payload = {}) => {
            handleJoinRoom(socket, io, payload, currentRoom);
            currentRoom = (payload.room || 'default').trim() || 'default';
        });

        // Запрос списка комнат
        socket.on('get rooms', () => {
            handleGetRooms(socket, io);
        });

        // Запрос состояния комнаты
        socket.on('request room state', (payload = {}) => {
            handleRequestRoomState(socket, currentRoom, payload);
        });

        // Начало рисования
        socket.on('draw start', (data) => {
            handleDrawStart(socket, currentRoom, data);
        });

        // Продолжение рисования
        socket.on('draw continue', (data) => {
            handleDrawContinue(socket, currentRoom, data);
        });

        // Завершение рисования
        socket.on('draw end', (data) => {
            handleDrawEnd(socket, currentRoom, data);
        });

        // Очистка canvas
        socket.on('clear canvas', () => {
            handleClearCanvas(socket, currentRoom);
        });

        // Отключение пользователя
        socket.on('disconnect', () => {
            handleDisconnect(socket, io, currentRoom);
        });
    });
}

/**
 * Обработка присоединения к комнате
 */
function handleJoinRoom(socket, io, payload, currentRoomRef) {
    const requestedRoom = (payload.room || 'default').trim() || 'default';

    if (currentRoomRef) {
        socket.leave(currentRoomRef);
        roomManager.updateRoomUserCount(io, currentRoomRef);
    }

    socket.join(requestedRoom);
    roomManager.updateRoomUserCount(io, requestedRoom);
    console.log(`Пользователь ${socket.id} присоединился к комнате ${requestedRoom}`);
    socket.emit('room joined', { room: requestedRoom });

    // Отправляем состояние комнаты новому пользователю
    const state = roomManager.getRoomState(requestedRoom);
    socket.emit('room state', { strokes: state.strokes });

    return requestedRoom;
}

/**
 * Обработка запроса списка комнат
 */
function handleGetRooms(socket, io) {
    const rooms = roomManager.getActiveRooms(io);
    socket.emit('rooms list', { rooms });
}

/**
 * Обработка запроса состояния комнаты
 */
function handleRequestRoomState(socket, currentRoom, payload) {
    const room = (payload.room || currentRoom || 'default').trim() || 'default';
    const state = roomManager.getRoomState(room);
    socket.emit('room state', { strokes: state.strokes });
}

/**
 * Обработка начала рисования
 */
function handleDrawStart(socket, currentRoom, data) {
    const room = currentRoom || 'default';
    console.log('Начало рисования от', socket.id, data, 'в комнате', room);

    // Сохраняем начало штриха в состояние комнаты
    if (data && data.x !== undefined && data.y !== undefined) {
        roomManager.addStrokeToRoom(room, socket.id, data.strokeId, data.color, data.size, [{ x: data.x, y: data.y }]);
    }

    socket.to(room).emit('draw start', { data, userId: socket.id });
}

/**
 * Обработка продолжения рисования
 */
function handleDrawContinue(socket, currentRoom, data) {
    const room = currentRoom || 'default';
    console.log('Продолжение рисования от', socket.id, 'в комнате', room);

    // Обновляем штрих в состоянии комнаты
    if (data && data.x !== undefined && data.y !== undefined) {
        roomManager.updateStrokeInRoom(room, socket.id, data.strokeId, { x: data.x, y: data.y });
    }

    socket.to(room).emit('draw continue', { data, userId: socket.id });
}

/**
 * Обработка завершения рисования
 */
function handleDrawEnd(socket, currentRoom, data) {
    const room = currentRoom || 'default';
    console.log('Завершение рисования от', socket.id, 'в комнате', room);

    // Штрих завершен, но остается в состоянии комнаты для других пользователей
    socket.to(room).emit('draw end', { data, userId: socket.id });
}

/**
 * Обработка очистки canvas
 */
function handleClearCanvas(socket, currentRoom) {
    const room = currentRoom || 'default';
    console.log('Очистка canvas от', socket.id, 'в комнате', room);

    // Очищаем состояние комнаты
    roomManager.clearRoomState(room);

    socket.to(room).emit('clear canvas');
    // Также отправляем себе, чтобы синхронизировать
    socket.emit('clear canvas');
}

/**
 * Обработка отключения пользователя
 */
function handleDisconnect(socket, io, currentRoom) {
    console.log('Пользователь отключился:', socket.id);
    // Обновляем счетчик пользователей в комнате при отключении
    if (currentRoom) {
        roomManager.updateRoomUserCount(io, currentRoom);
    }
}

module.exports = {
    setupSocketHandlers
};
