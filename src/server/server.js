const http = require('http');
const socketIo = require('socket.io');
const { createApp } = require('./app');
const { setupSocketHandlers } = require('../socket/socketHandler');
const roomManager = require('../rooms/roomManager');
const { UserManager, SessionManager } = require('../utils/database');

const config = require('../utils/config');
const PORT = config.get('server.port');
const HOST = config.get('server.host');

const app = createApp();
const server = http.createServer(app);
const io = socketIo(server);

setupSocketHandlers(io);

async function startAutoCleanup() {
    console.log('Запуск автоматической очистки базы данных...');

    // Очистка каждые 5 минут
    setInterval(async () => {
        try {
            const sessionsCleaned = await SessionManager.cleanExpiredSessions();

            // Используем таймаут для активных комнат (с пользователями) для удаления из БД
            const activeRoomTimeoutMinutes = Math.ceil(config.get('rooms.activeRoomTimeout') / (1000 * 60));
            const roomsCleaned = await UserManager.deleteOldRooms(activeRoomTimeoutMinutes);

            if (sessionsCleaned > 0 || roomsCleaned > 0) {
                console.log(`Автоматическая очистка: ${sessionsCleaned} сессий, ${roomsCleaned} комнат`);
            }
        } catch (error) {
            console.error('Ошибка автоматической очистки:', error);
        }
    }, 5 * 60 * 1000);

    // очищаем комнаты из памяти
    setInterval(async () => {
        try {
            const inactiveTimeout = config.get('rooms.inactiveRoomTimeout'); // 1 час для неактивных
            const activeTimeout = config.get('rooms.activeRoomTimeout'); // 2 суток для активных
            const cleaned = await roomManager.cleanupInactiveRooms(inactiveTimeout, activeTimeout);
            if (cleaned > 0) {
                console.log(`Очищено ${cleaned} неактивных комнат из памяти`);
            }
        } catch (error) {
            console.error('Ошибка очистки комнат в памяти:', error);
        }
    }, 5 * 30 * 1000);
}

server.listen(PORT, HOST, () => {
    console.log(`Сервер запущен на http://${HOST}:${PORT}`);
    console.log(`Страница комнат: http://${HOST}:${PORT}/rooms`);
    console.log(`Страница рисования: http://${HOST}:${PORT}/drawing`);

    startAutoCleanup();
});

module.exports = {
    app,
    server,
    io
};


// после создания приватной комнаты все равно переносит на неприватную 