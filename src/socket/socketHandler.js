/**
 * Обработчик Socket.IO событий
 */

const roomManager = require('../rooms/roomManager');
const userManager = require('../utils/userManager');

/**
 * Настраивает обработчики Socket.IO событий
 * @param {Object} io - Socket.IO сервер
 */
function setupSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log('Новый пользователь подключился:', socket.id);

        let currentRoom = null;
        let currentUser = null;

        // Аутентификация пользователя
        socket.on('authenticate', async (payload = {}) => {
            try {
                const sessionId = payload.sessionId;
                const ipAddress = socket.handshake.address;
                const userAgent = socket.handshake.headers['user-agent'];

                currentUser = await userManager.getOrCreateUser(sessionId, ipAddress, userAgent);

                // Сохраняем пользователя на объекте socket для использования в других функциях
                socket.currentUser = currentUser;

                socket.emit('authenticated', {
                    user: {
                        id: currentUser.id,
                        nickname: currentUser.nickname
                    }
                });

                console.log(`Пользователь ${currentUser.nickname} (${currentUser.id}) аутентифицирован`);
            } catch (error) {
                console.error('Ошибка аутентификации:', error);
                socket.emit('authentication error', { error: 'Ошибка аутентификации' });
            }
        });

        // Создание комнаты с паролем
        socket.on('create room', async (payload = {}) => {
            try {
                const roomName = (payload.room || '').trim();
                const password = payload.password;

                if (!roomName) {
                    socket.emit('room creation error', { error: 'Название комнаты обязательно' });
                    return;
                }

                if (!currentUser) {
                    socket.emit('room creation error', { error: 'Пользователь не аутентифицирован' });
                    return;
                }

                const result = await roomManager.createRoom(roomName, password, currentUser.id);

                socket.emit('room created', {
                    room: roomName,
                    isPrivate: result.isPrivate
                });

                console.log(`Комната ${roomName} создана пользователем ${currentUser.nickname}`);
            } catch (error) {
                console.error('Ошибка создания комнаты:', error);
                socket.emit('room creation error', { error: error.message || 'Ошибка создания комнаты' });
            }
        });

        // Присоединение к комнате
        socket.on('join room', async (payload = {}) => {
            try {
                const roomName = (payload.room || 'default').trim() || 'default';
                const password = payload.password;

                // Автоматически создаем пользователя, если его нет
                if (!currentUser) {
                    const sessionId = payload.sessionId || socket.id; // Используем socket.id как sessionId если нет настоящего
                    const ipAddress = socket.handshake.address;
                    const userAgent = socket.handshake.headers['user-agent'];

                    currentUser = await userManager.getOrCreateUser(sessionId, ipAddress, userAgent);
                    socket.currentUser = currentUser;

                    console.log(`Автоматически создан пользователь ${currentUser.nickname} для socket ${socket.id}`);
                }

                // Получаем информацию о комнате
                const roomInfo = await roomManager.getRoomInfo(roomName);

                // Если комната существует и является приватной
                if (roomInfo && roomInfo.password_hash) {
                    // Проверяем пароль
                    const isValidPassword = await roomManager.verifyRoomPassword(roomName, password);
                    if (!isValidPassword) {
                        socket.emit('join room error', { error: 'Неверный пароль для приватной комнаты' });
                        return;
                    }
                } else if (!roomInfo) {
                    // Комната не существует - создаем публичную
                    await roomManager.createRoom(roomName, null, currentUser.id);
                    console.log(`Создана новая публичная комната: ${roomName}`);
                }

                // Присоединяемся к комнате
                handleJoinRoom(socket, io, payload, currentRoom, currentUser);
                currentRoom = roomName;

                console.log(`Пользователь ${currentUser.nickname} присоединился к комнате ${roomName}`);
            } catch (error) {
                console.error('Ошибка присоединения к комнате:', error);
                socket.emit('join room error', { error: error.message || 'Ошибка присоединения к комнате' });
            }
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
            handleDisconnect(socket, io, currentRoom, currentUser);
        });
    });
}

/**
 * Обработка присоединения к комнате
 */
function handleJoinRoom(socket, io, payload, currentRoomRef, currentUser) {
    const requestedRoom = (payload.room || 'default').trim() || 'default';

    if (currentRoomRef) {
        socket.leave(currentRoomRef);
        roomManager.updateRoomUsers(io, currentRoomRef);
    }

    socket.join(requestedRoom);
    roomManager.updateRoomUsers(io, requestedRoom);
    console.log(`Пользователь ${socket.id} присоединился к комнате ${requestedRoom}`);
    socket.emit('room joined', { room: requestedRoom });

    // Отправляем состояние комнаты новому пользователю
    const state = roomManager.getRoomState(requestedRoom);
    socket.emit('room state', { strokes: state.strokes });

    // Обновляем список пользователей для всех в комнате
    updateUsersList(io, requestedRoom);

    return requestedRoom;
}

/**
 * Обновляет список пользователей для комнаты с реальными никами
 */
function updateUsersList(io, roomName) {
    const room = io.sockets.adapter.rooms.get(roomName);
    if (!room) return;

    const usersList = [];

    for (const socketId of room) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket && socket.currentUser) {
            usersList.push({
                id: socketId,
                name: socket.currentUser.nickname,
                authenticated: true
            });
        } else {
            // Fallback для пользователей без currentUser (хотя теперь это не должно происходить)
            usersList.push({
                id: socketId,
                name: `Пользователь ${socketId.substring(0, 6)}`,
                authenticated: false
            });
        }
    }

    io.to(roomName).emit('users list update', { users: usersList });
}

/**
 * Обработка запроса списка комнат
 */
async function handleGetRooms(socket, io) {
    try {
        const rooms = await roomManager.getActiveRooms(io);
        socket.emit('rooms list', { rooms });
    } catch (error) {
        console.error('Error getting rooms list:', error);
        socket.emit('rooms list', { rooms: [] });
    }
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
function handleDisconnect(socket, io, currentRoom, currentUser) {
    const userName = currentUser ? currentUser.nickname : socket.currentUser ? socket.currentUser.nickname : socket.id;
    console.log(`Пользователь ${userName} отключился`);

    // Обновляем счетчик пользователей в комнате при отключении
    if (currentRoom) {
        roomManager.updateRoomUsers(io, currentRoom);
        updateUsersList(io, currentRoom);
    }
}

module.exports = {
    setupSocketHandlers
};
