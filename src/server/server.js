/**
 * Основной серверный файл
 */

const http = require('http');
const socketIo = require('socket.io');
const { createApp } = require('./app');
const { setupSocketHandlers } = require('../socket/socketHandler');

// Конфигурация сервера
const config = require('../utils/config');
const PORT = config.get('server.port');
const HOST = config.get('server.host');

// Создаем Express приложение
const app = createApp();

// Создаем HTTP сервер
const server = http.createServer(app);

// Создаем Socket.IO сервер
const io = socketIo(server);

// Настраиваем обработчики Socket.IO
setupSocketHandlers(io);

// Запуск сервера
server.listen(PORT, HOST, () => {
    console.log(`🚀 Сервер запущен на http://${HOST}:${PORT}`);
    console.log(`📝 Страница комнат: http://${HOST}:${PORT}/rooms`);
    console.log(`🎨 Страница рисования: http://${HOST}:${PORT}/drawing`);
});

module.exports = {
    app,
    server,
    io
};
