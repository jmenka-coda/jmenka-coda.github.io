/**
 * Middleware для обработки ошибок
 */

const Logger = require('../utils/logger');
const logger = new Logger('ErrorHandler');

/**
 * Обработчик ошибок
 * @param {Error} err - объект ошибки
 * @param {Object} req - объект запроса
 * @param {Object} res - объект ответа
 * @param {Function} next - следующая middleware функция
 */
function errorHandler(err, req, res, next) {
    logger.error('Unhandled error:', err.message);
    logger.error('Stack trace:', err.stack);

    // Определяем тип ошибки и возвращаем соответствующий статус
    let statusCode = 500;
    let message = 'Внутренняя ошибка сервера';

    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Ошибка валидации данных';
    } else if (err.name === 'UnauthorizedError') {
        statusCode = 401;
        message = 'Неавторизованный доступ';
    } else if (err.code === 'ENOENT') {
        statusCode = 404;
        message = 'Файл не найден';
    }

    // Отправляем ответ с ошибкой
    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack,
            details: err.message
        })
    });
}

/**
 * Обработчик для случаев, когда маршрут не найден
 */
function notFoundHandler(req, res) {
    res.status(404).json({
        error: 'Маршрут не найден',
        path: req.path,
        method: req.method
    });
}

module.exports = errorHandler;
module.exports.notFoundHandler = notFoundHandler;
