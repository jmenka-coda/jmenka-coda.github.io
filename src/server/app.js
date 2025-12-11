/**
 * Express приложение
 */

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const pagesRouter = require('../../routes/pages');
const apiRouter = require('../../routes/api');
const errorHandler = require('../middleware/errorHandler');

/**
 * Создает и настраивает Express приложение
 * @param {Object} io - Socket.IO сервер
 * @returns {Object} настроенное Express приложение
 */
function createApp(io) {
    const app = express();

    // Сохраняем io для использования в маршрутах
    app.set('io', io);

    // Middleware для парсинга JSON
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Middleware для парсинга cookies
    app.use(cookieParser());

    // Настройка статических файлов
    app.use(express.static('public'));

    // CORS middleware для Socket.IO
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        if (req.method === 'OPTIONS') {
            res.sendStatus(200);
        } else {
            next();
        }
    });

    // Подключаем маршруты
    app.use('/', pagesRouter);
    app.use('/api', apiRouter);

    // Обработчик 404
    app.use((req, res) => {
        res.status(404).json({ error: 'Маршрут не найден' });
    });

    // Middleware для обработки ошибок
    app.use(errorHandler);

    return app;
}

module.exports = {
    createApp
};
