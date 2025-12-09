/**
 * Middleware для валидации данных
 */

const config = require('../utils/config');

/**
 * Валидация названия комнаты
 * @param {string} roomName - название комнаты
 * @returns {Object} результат валидации {isValid: boolean, error: string}
 */
function validateRoomName(roomName) {
    if (!roomName || typeof roomName !== 'string') {
        return { isValid: false, error: 'Название комнаты обязательно' };
    }

    const trimmed = roomName.trim();
    const minLength = config.get('rooms.minNameLength') || 2;
    const maxLength = config.get('rooms.maxNameLength') || 50;

    if (trimmed.length < minLength) {
        return { isValid: false, error: `Название комнаты должно содержать минимум ${minLength} символа` };
    }

    if (trimmed.length > maxLength) {
        return { isValid: false, error: `Название комнаты не должно превышать ${maxLength} символов` };
    }

    // Проверка на допустимые символы (только буквы, цифры, пробелы, дефисы, подчеркивания)
    const validPattern = /^[a-zA-Zа-яА-Я0-9\s\-_]+$/;
    if (!validPattern.test(trimmed)) {
        return { isValid: false, error: 'Название комнаты может содержать только буквы, цифры, пробелы, дефисы и подчеркивания' };
    }

    return { isValid: true, roomName: trimmed };
}

/**
 * Валидация данных рисования
 * @param {Object} data - данные рисования
 * @returns {Object} результат валидации {isValid: boolean, error: string}
 */
function validateDrawingData(data) {
    if (!data || typeof data !== 'object') {
        return { isValid: false, error: 'Данные рисования обязательны' };
    }

    // Проверка координат
    if (typeof data.x !== 'number' || typeof data.y !== 'number') {
        return { isValid: false, error: 'Координаты должны быть числами' };
    }

    // Проверка цвета
    if (typeof data.color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
        return { isValid: false, error: 'Неверный формат цвета' };
    }

    // Проверка размера
    if (typeof data.size !== 'number' || data.size < 1 || data.size > 50) {
        return { isValid: false, error: 'Размер кисти должен быть от 1 до 50' };
    }

    // Проверка ID штриха
    if (data.strokeId && typeof data.strokeId !== 'string') {
        return { isValid: false, error: 'ID штриха должен быть строкой' };
    }

    return { isValid: true };
}

/**
 * Middleware для валидации названия комнаты в запросах
 */
function validateRoomNameMiddleware(req, res, next) {
    const { roomName } = req.params;

    const validation = validateRoomName(roomName);
    if (!validation.isValid) {
        return res.status(400).json({
            error: 'Неверное название комнаты',
            details: validation.error
        });
    }

    // Добавляем валидированное название в запрос
    req.validatedRoomName = validation.roomName;
    next();
}

/**
 * Middleware для валидации данных рисования
 */
function validateDrawingDataMiddleware(req, res, next) {
    const data = req.body;

    const validation = validateDrawingData(data);
    if (!validation.isValid) {
        return res.status(400).json({
            error: 'Неверные данные рисования',
            details: validation.error
        });
    }

    next();
}

/**
 * Middleware для ограничения размера тела запроса
 */
function requestSizeLimitMiddleware(limit = '10mb') {
    return (req, res, next) => {
        const contentLength = parseInt(req.headers['content-length']);
        if (contentLength > parseInt(limit) * 1024 * 1024) {
            return res.status(413).json({ error: 'Превышен размер запроса' });
        }
        next();
    };
}

module.exports = {
    validateRoomName,
    validateDrawingData,
    validateRoomNameMiddleware,
    validateDrawingDataMiddleware,
    requestSizeLimitMiddleware
};
