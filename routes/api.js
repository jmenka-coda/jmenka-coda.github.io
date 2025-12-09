/**
 * API маршруты
 */

const express = require('express');
const router = express.Router();
const roomManager = require('../src/rooms/roomManager');

/**
 * Получение списка активных комнат
 */
router.get('/rooms', (req, res) => {
    try {
        // io передается через app.set('io', io) в app.js
        const io = req.app.get('io');
        if (!io) {
            return res.status(500).json({ error: 'Socket.IO сервер недоступен' });
        }

        const rooms = roomManager.getActiveRooms(io);
        res.json({ rooms });
    } catch (error) {
        console.error('Ошибка при получении списка комнат:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

/**
 * Получение информации о конкретной комнате
 */
router.get('/rooms/:roomName', (req, res) => {
    try {
        const { roomName } = req.params;
        const io = req.app.get('io');

        if (!io) {
            return res.status(500).json({ error: 'Socket.IO сервер недоступен' });
        }

        const roomState = roomManager.getRoomState(roomName);
        const room = io.sockets.adapter.rooms.get(roomName);
        const userCount = room ? room.size : 0;

        res.json({
            name: roomName,
            userCount,
            strokeCount: roomState.strokes.length,
            createdAt: roomState.createdAt,
            lastActivity: roomState.lastActivity
        });
    } catch (error) {
        console.error('Ошибка при получении информации о комнате:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

/**
 * Статистика сервера
 */
router.get('/stats', (req, res) => {
    try {
        const io = req.app.get('io');
        const totalRooms = roomManager.getTotalRoomCount();
        const totalUsers = io ? io.engine.clientsCount : 0;

        res.json({
            totalRooms,
            totalUsers,
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

module.exports = router;
