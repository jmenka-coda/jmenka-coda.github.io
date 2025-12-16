/**
 * Менеджер комнат - управление состоянием комнат и пользователей
 */

const Logger = require('../utils/logger');
const config = require('../utils/config');
const { RoomManager: DBRoomManager } = require('../utils/database');
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
            usersId: [],
            isPrivate: false
        });
        logger.info(`Created new room: ${roomName}`);
    }
    return roomStates.get(roomName);
}

/**
 * Создает комнату с опциональным паролем
 * @param {string} roomName - название комнаты
 * @param {string} password - пароль (опционально)
 * @param {string} createdBy - ID пользователя, создавшего комнату
 * @returns {Promise<Object>} результат создания
 */
async function createRoom(roomName, password = null, createdBy = null) {
    try {
        const bcrypt = require('bcryptjs');
        let passwordHash = null;

        if (password && password.trim()) {
            passwordHash = await bcrypt.hash(password.trim(), 10);
        }

        // Сохраняем в базу данных
        await DBRoomManager.upsertRoom(roomName, passwordHash, createdBy);

        // Создаем состояние в памяти
        const state = getRoomState(roomName);
        state.isPrivate = passwordHash !== null;

        logger.info(`Created room: ${roomName}, private: ${state.isPrivate}`);
        return { success: true, isPrivate: state.isPrivate };
    } catch (error) {
        logger.error(`Error creating room ${roomName}:`, error);
        throw error;
    }
}

/**
 * Проверяет пароль для доступа к приватной комнате
 * @param {string} roomName - название комнаты
 * @param {string} password - пароль для проверки
 * @returns {Promise<boolean>} результат проверки
 */
async function verifyRoomPassword(roomName, password) {
    try {
        return await DBRoomManager.verifyRoomPassword(roomName, password);
    } catch (error) {
        logger.error(`Error verifying password for room ${roomName}:`, error);
        return false;
    }
}

/**
 * Получает информацию о комнате из базы данных
 * @param {string} roomName - название комнаты
 * @returns {Promise<Object|null>} информация о комнате
 */
async function getRoomInfo(roomName) {
    try {
        return await DBRoomManager.getRoomByName(roomName);
    } catch (error) {
        logger.error(`Error getting room info for ${roomName}:`, error);
        return null;
    }
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

    // Не удаляем комнаты из памяти, чтобы они оставались в списке
    // Комнаты будут удаляться только по таймеру cleanupInactiveRooms
    // или при перезапуске сервера
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

    // Обновляем активность в базе данных (асинхронно, не блокируем рисование)
    updateRoomActivity(roomName).catch(error => {
        logger.error(`Failed to update room activity for ${roomName}:`, error);
    });

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
 * Получает список всех комнат из базы данных
 * @returns {Promise<Array>} массив комнат с информацией
 */
async function getAllRoomsFromDB() {
    try {
        const dbRooms = await DBRoomManager.getAllRooms();
        return dbRooms.map(dbRoom => ({
            name: dbRoom.name,
            userCount: 0, // Без io сервера не можем узнать количество пользователей
            strokeCount: 0,
            usersId: null,
            isPrivate: dbRoom.is_private,
            createdAt: dbRoom.created_at,
            lastActivity: dbRoom.last_activity
        }));
    } catch (error) {
        logger.error('Error getting rooms from database:', error);
        return [];
    }
}

/**
 * Получает список всех активных комнат
 * @param {Object} io - Socket.IO сервер
 * @returns {Promise<Array>} массив комнат с информацией
 */
async function getActiveRooms(io) {
    const rooms = [];

    // Получаем информацию о комнатах из базы данных
    const dbRooms = await DBRoomManager.getAllRooms();

    // Если io сервер доступен, обновляем счетчики пользователей
    if (io) {
        const dbRoomsMap = new Map(dbRooms.map(room => [room.name, room]));

        // Обновляем счетчики пользователей для всех комнат
        for (const [roomName, state] of roomStates) {
            const room = io.sockets.adapter.rooms.get(roomName);
            const userCount = room ? room.size : 0;
            state.userCount = userCount;

            const dbRoom = dbRoomsMap.get(roomName);

            // Отображаем все комнаты из памяти, если они есть в базе данных
            if (dbRoom) {
                rooms.push({
                    name: roomName,
                    userCount: userCount,
                    strokeCount: state.strokes.length,
                    usersId: room,
                    isPrivate: dbRoom.is_private,
                    createdAt: dbRoom.created_at,
                    lastActivity: dbRoom.last_activity
                });
            }
        }

        // Добавляем комнаты из базы данных, которые не активны в памяти, но существуют
        for (const dbRoom of dbRooms) {
            if (!roomStates.has(dbRoom.name)) {
                // Проверяем, есть ли активные пользователи в комнате
                const room = io.sockets.adapter.rooms.get(dbRoom.name);
                const userCount = room ? room.size : 0;

                // Отображаем все комнаты из базы данных, даже пустые
                rooms.push({
                    name: dbRoom.name,
                    userCount: userCount,
                    strokeCount: 0,
                    usersId: room,
                    isPrivate: dbRoom.is_private,
                    createdAt: dbRoom.created_at,
                    lastActivity: dbRoom.last_activity
                });
            }
        }
    } else {
        // Если io сервер недоступен (REST API), просто возвращаем все комнаты из БД
        for (const dbRoom of dbRooms) {
            rooms.push({
                name: dbRoom.name,
                userCount: 0, // Без io сервера не можем узнать количество пользователей
                strokeCount: 0,
                usersId: null,
                isPrivate: dbRoom.is_private,
                createdAt: dbRoom.created_at,
                lastActivity: dbRoom.last_activity
            });
        }
    }

    // Удаляем пустые комнаты из памяти
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
 * @param {number} inactiveTimeout - таймаут для неактивных комнат (без пользователей) в миллисекундах
 * @param {number} activeTimeout - таймаут для активных комнат (с пользователями) в миллисекундах
 */
async function cleanupInactiveRooms(inactiveTimeout = 30 * 1000, activeTimeout = 5 * 60 * 1000) { // неактивные: 30 сек, активные: 5 мин
    const now = new Date();
    let cleanedCount = 0;

    try {
        // Получаем все комнаты из базы данных
        const dbRooms = await DBRoomManager.getAllRooms();
        const dbRoomNames = new Set(dbRooms.map(room => room.name));

        for (const [roomName, state] of roomStates) {
            const age = now - state.lastActivity;

            // Для комнат без пользователей используем меньший таймаут (неактивные комнаты)
            // Для комнат с пользователями используем больший таймаут (активные комнаты)
            const timeout = state.userCount > 0 ? activeTimeout : inactiveTimeout;

            // Не удаляем комнаты, которые есть в базе данных
            if (!dbRoomNames.has(roomName) && state.userCount === 0 && age > timeout) {
                roomStates.delete(roomName);
                cleanedCount++;
            }
        }
    } catch (error) {
        logger.error('Error during room cleanup:', error);
        // В случае ошибки очищаем только очень старые комнаты
        for (const [roomName, state] of roomStates) {
            const age = now - state.lastActivity;
            if (state.userCount === 0 && age > inactiveTimeout * 2) {
                roomStates.delete(roomName);
                cleanedCount++;
            }
        }
    }

    if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} inactive rooms from memory`);
    }

    return cleanedCount;
}

/**
 * Обновляет время последней активности комнаты в базе данных
 * @param {string} roomName - название комнаты
 */
async function updateRoomActivity(roomName) {
    try {
        await DBRoomManager.updateRoomActivity(roomName);
    } catch (error) {
        logger.error(`Error updating room activity for ${roomName}:`, error);
    }
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
    getAllRoomsFromDB,
    clearRoomState,
    createRoom,
    verifyRoomPassword,
    getRoomInfo,
    cleanupInactiveRooms,
    updateRoomActivity
};
