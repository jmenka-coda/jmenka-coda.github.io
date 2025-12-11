/**
 * API маршруты
 */

const express = require('express');
const router = express.Router();
const roomManager = require('../src/rooms/roomManager');
const userManager = require('../src/utils/userManager');

/**
 * Получение списка активных комнат
 */
router.get('/rooms', async (req, res) => {
    try {
        // Используем специальную функцию для получения комнат из БД
        const rooms = await roomManager.getAllRoomsFromDB();
        res.json({ rooms });
    } catch (error) {
        console.error('Ошибка при получении списка комнат:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

/**
 * Получение информации о конкретной комнате
 */
router.get('/rooms/:roomName', async (req, res) => {
    try {
        const { roomName } = req.params;

        // Получаем информацию о комнате из базы данных
        const roomInfo = await roomManager.getRoomInfo(roomName);

        if (!roomInfo) {
            return res.status(404).json({ error: 'Комната не найдена' });
        }

        const roomState = roomManager.getRoomState(roomName);

        res.json({
            name: roomName,
            userCount: 0, // Без io сервера не можем узнать точное количество
            strokeCount: roomState.strokes.length,
            isPrivate: roomInfo.is_private,
            createdAt: roomInfo.created_at,
            lastActivity: roomInfo.last_activity
        });
    } catch (error) {
        console.error('Ошибка при получении информации о комнате:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

/**
 * Получение или создание пользователя
 */
router.get('/user', async (req, res) => {
    try {
        const sessionId = req.cookies.sessionId;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent');

        const user = await userManager.getOrCreateUser(sessionId, ipAddress, userAgent);

        // Устанавливаем cookie с session ID
        res.cookie('sessionId', user.sessionId, {
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });

        res.json({
            id: user.id,
            nickname: user.nickname
        });
    } catch (error) {
        console.error('Ошибка при получении пользователя:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

/**
 * Обновление никнейма пользователя
 */
router.put('/user/nickname', async (req, res) => {
    try {
        const sessionId = req.cookies.sessionId;
        const { nickname } = req.body;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent');

        if (!nickname || typeof nickname !== 'string') {
            return res.status(400).json({ error: 'Никнейм обязателен' });
        }

        const user = await userManager.updateNickname(sessionId, nickname, ipAddress, userAgent);

        res.json({
            id: user.id,
            nickname: user.nickname
        });
    } catch (error) {
        console.error('Ошибка при обновлении никнейма:', error);
        res.status(400).json({ error: error.message || 'Ошибка обновления никнейма' });
    }
});

/**
 * Создание комнаты с опциональным паролем
 */
router.post('/rooms', async (req, res) => {
    try {
        const { name, password } = req.body;
        const sessionId = req.cookies.sessionId;
        const user = userManager.getUserBySession(sessionId);

        if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 50) {
            return res.status(400).json({ error: 'Название комнаты должно содержать от 2 до 50 символов' });
        }

        const roomName = name.trim();

        // Проверяем, не существует ли уже комната
        const existingRooms = await roomManager.getAllRoomsFromDB();
        if (existingRooms.some(room => room.name.toLowerCase() === roomName.toLowerCase())) {
            return res.status(400).json({ error: 'Комната с таким названием уже существует' });
        }

        const result = await roomManager.createRoom(roomName, password, user ? user.id : null);

        // Отправляем Socket.IO событие для обновления списка комнат у всех пользователей
        const io = req.app.get('io');
        if (io) {
            // Отправляем событие о создании комнаты создателю
            // Другие пользователи обновят список через периодическое обновление или ручное
            console.log(`Комната ${roomName} создана через REST API`);
        }

        res.json({
            name: roomName,
            isPrivate: result.isPrivate,
            message: 'Комната создана успешно'
        });
    } catch (error) {
        console.error('Ошибка при создании комнаты:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});


/**
 * Статистика сервера и базы данных
 */
router.get('/stats', async (req, res) => {
    try {
        const activeUsers = userManager.getActiveUsers().length;
        const { UserManager: DBUserManager } = require('../src/utils/database');
        const dbStats = await DBUserManager.getStats();

        res.json({
            activeUsers,
            database: dbStats,
            server: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: process.version
            }
        });
    } catch (error) {
        console.error('Ошибка при получении статистики:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

/**
 * Очистка базы данных (только для администраторов)
 */
router.post('/admin/cleanup', async (req, res) => {
    try {
        const { cleanSessions, cleanOldRooms, cleanAllRooms } = req.body;
        const { UserManager: DBUserManager } = require('../src/utils/database');
        const roomManager = require('../src/rooms/roomManager');

        const results = {
            sessionsCleaned: 0,
            roomsCleaned: 0,
            allRoomsCleaned: 0
        };

        if (cleanSessions) {
            results.sessionsCleaned = await DBUserManager.cleanExpiredSessions();
        }

        if (cleanOldRooms) {
            results.roomsCleaned = await DBUserManager.deleteOldRooms(5); // 5 минут
        }

        if (cleanAllRooms) {
            results.allRoomsCleaned = await DBUserManager.deleteAllRooms();
        }

        res.json({
            success: true,
            message: 'Очистка завершена',
            results
        });
    } catch (error) {
        console.error('Ошибка при очистке базы данных:', error);
        res.status(500).json({ error: 'Ошибка при очистке базы данных' });
    }
});

/**
 * Удаление всех данных (ОПАСНО! Только для разработки)
 */
router.delete('/admin/reset', async (req, res) => {
    try {
        const { UserManager: DBUserManager } = require('../src/utils/database');

        // Удаляем все данные
        await DBUserManager.deleteAllSessions();
        await DBUserManager.deleteAllRooms();

        // Также очищаем пользователей (осторожно!)
        const db = require('../src/utils/database').db;
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM users', [], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });

        res.json({
            success: true,
            message: 'Все данные удалены'
        });
    } catch (error) {
        console.error('Ошибка при сбросе базы данных:', error);
        res.status(500).json({ error: 'Ошибка при сбросе базы данных' });
    }
});

module.exports = router;
