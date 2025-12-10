/**
 * Менеджер комнат - управление состоянием комнат и пользователей
 */

const Logger = require('../utils/logger');
const config = require('../utils/config');
const logger = new Logger('RoomManager');

// Хранилище состояния комнат: roomName -> { strokes: [...], userCount: number, createdAt: Date }
const roomStates = new Map();

/**
 * Получает состояние комнаты, создает если не существует
 * @param {string} roomName - название комнаты
 * @returns {Object} состояние комнаты
 */
function getRoomState(roomName) {
    if (!roomStates.has(roomName)) {
        roomStates.set(roomName, {
            strokes: [],
            userCount: 0,
            createdAt: new Date(),
            lastActivity: new Date(),
            usersId: []
        });
        logger.info(`Created new room: ${roomName}`);
    }
    return roomStates.get(roomName);
}

/**
 * Обновляет счетчик пользователей в комнате и отправляет обновление всем пользователям
 * @param {Object} io - Socket.IO сервер
 * @param {string} roomName - название комнаты
 */
function updateRoomUsers(io, roomName) {
    const room = io.sockets.adapter.rooms.get(roomName);
    const userCount = room ? room.size : 0;
    const state = getRoomState(roomName);
    state.userCount = userCount;

    // Сохраняем Set socket.id пользователей
    state.usersId = room || new Set();

    // Отправляем обновленный список пользователей всем в комнате
    const usersArray = Array.from(state.usersId);
    const usersList = usersArray.map((socketId, index) => ({
        id: socketId,
        name: `Пользователь ${index + 1}` // Пока используем простые имена
    }));

    io.to(roomName).emit('users list update', { users: usersList });

    // Если в комнате нет пользователей и нет штрихов, удаляем состояние комнаты
    if (userCount === 0 && (!state.strokes || state.strokes.length === 0)) {
        roomStates.delete(roomName);
    }
}

/**
 * Добавляет штрих в состояние комнаты
 * @param {string} roomName - название комнаты
 * @param {string} userId - ID пользователя
 * @param {string} strokeId - ID штриха
 * @param {string} color - цвет штриха
 * @param {number} size - размер штриха
 * @param {Array} points - массив точек
 */
function addStrokeToRoom(roomName, userId, strokeId, color, size, points) {
    const state = getRoomState(roomName);
    state.lastActivity = new Date();

    // Ограничение на количество штрихов в комнате
    const maxStrokes = config.get('drawing.maxStrokesPerRoom') || 5000;
    if (state.strokes.length >= maxStrokes) {
        // Удаляем старые штрихи, чтобы не превышать лимит
        state.strokes = state.strokes.slice(-maxStrokes + 100);
        logger.warn(`Room ${roomName} exceeded stroke limit, cleaned up old strokes`);
    }

    const stroke = {
        userId,
        strokeId,
        color,
        size,
        points: points || [],
        timestamp: new Date()
    };
    state.strokes.push(stroke);
}

/**
 * Обновляет штрих в состоянии комнаты
 * @param {string} roomName - название комнаты
 * @param {string} userId - ID пользователя
 * @param {string} strokeId - ID штриха
 * @param {Object} point - точка для добавления
 */
function updateStrokeInRoom(roomName, userId, strokeId, point) {
    const state = getRoomState(roomName);
    const stroke = state.strokes.find(s => s.userId === userId && s.strokeId === strokeId);
    if (stroke && point) {
        stroke.points.push({ x: point.x, y: point.y });
    }
}

/**
 * Удаляет штрих из состояния комнаты
 * @param {string} roomName - название комнаты
 * @param {string} userId - ID пользователя
 * @param {string} strokeId - ID штриха
 */
function removeStrokeFromRoom(roomName, userId, strokeId) {
    const state = getRoomState(roomName);
    const index = state.strokes.findIndex(s => s.userId === userId && s.strokeId === strokeId);
    if (index !== -1) {
        state.strokes.splice(index, 1);
    }
}

/**
 * Получает список всех активных комнат
 * @param {Object} io - Socket.IO сервер
 * @returns {Array} массив комнат с информацией
 */
function getActiveRooms(io) {
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
                strokeCount: state.strokes.length,
                usersId: room
            });
        }
    }

    // Удаляем пустые комнаты
    for (const [roomName, state] of roomStates) {
        if (state.userCount === 0 && state.strokes.length === 0) {
            roomStates.delete(roomName);
        }
    }

    return rooms;
}

/**
 * Очищает состояние комнаты
 * @param {string} roomName - название комнаты
 */
function clearRoomState(roomName) {
    const state = getRoomState(roomName);
    state.strokes = [];
    state.lastActivity = new Date();
    logger.info(`Cleared room state: ${roomName}`);
}

/**
 * Очищает неактивные комнаты
 * @param {number} maxAge - максимальный возраст комнаты в миллисекундах
 */
function cleanupInactiveRooms(maxAge = 30 * 60 * 1000) {
    const now = new Date();
    let cleanedCount = 0;

    for (const [roomName, state] of roomStates) {
        const age = now - state.lastActivity;
        if (state.userCount === 0 && age > maxAge) {
            roomStates.delete(roomName);
            cleanedCount++;
        }
    }

    if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} inactive rooms`);
    }

    return cleanedCount;
}

/**
 * Получает статистику комнат
 * @returns {Object} статистика
 */
function getRoomStats() {
    const stats = {
        totalRooms: roomStates.size,
        activeRooms: 0,
        totalUsers: 0,
        totalStrokes: 0
    };

    for (const [roomName, state] of roomStates) {
        if (state.userCount > 0) {
            stats.activeRooms++;
        }
        stats.totalUsers += state.userCount;
        stats.totalStrokes += state.strokes.length;
    }

    return stats;
}

module.exports = {
    getRoomState,
    updateRoomUsers,
    addStrokeToRoom,
    updateStrokeInRoom,
    removeStrokeFromRoom,
    getActiveRooms,
    clearRoomState
};
