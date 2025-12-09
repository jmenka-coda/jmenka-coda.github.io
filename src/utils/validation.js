/**
 * Validation utilities
 */

/**
 * Validate room name
 * @param {string} name - Room name to validate
 * @returns {Object} - { isValid: boolean, error: string }
 */
function validateRoomName(name) {
    if (!name || typeof name !== 'string') {
        return { isValid: false, error: 'Название комнаты должно быть строкой' };
    }

    const trimmed = name.trim();
    if (trimmed.length < 2) {
        return { isValid: false, error: 'Название комнаты должно содержать минимум 2 символа' };
    }

    if (trimmed.length > 50) {
        return { isValid: false, error: 'Название комнаты не должно превышать 50 символов' };
    }

    // Check for invalid characters (only alphanumeric, spaces, hyphens, underscores)
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) {
        return { isValid: false, error: 'Название комнаты может содержать только буквы, цифры, пробелы, дефисы и подчеркивания' };
    }

    return { isValid: true, error: null };
}

/**
 * Validate drawing data
 * @param {Object} data - Drawing data to validate
 * @returns {Object} - { isValid: boolean, error: string }
 */
function validateDrawingData(data) {
    if (!data || typeof data !== 'object') {
        return { isValid: false, error: 'Данные рисования должны быть объектом' };
    }

    const required = ['x', 'y', 'color', 'size', 'strokeId'];
    for (const field of required) {
        if (!(field in data)) {
            return { isValid: false, error: `Отсутствует обязательное поле: ${field}` };
        }
    }

    if (typeof data.x !== 'number' || typeof data.y !== 'number') {
        return { isValid: false, error: 'Координаты должны быть числами' };
    }

    if (typeof data.size !== 'number' || data.size < 1 || data.size > 50) {
        return { isValid: false, error: 'Размер кисти должен быть числом от 1 до 50' };
    }

    return { isValid: true, error: null };
}

/**
 * Sanitize string input
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeString(input) {
    if (!input || typeof input !== 'string') return '';
    return input.trim().replace(/[<>]/g, '');
}

module.exports = {
    validateRoomName,
    validateDrawingData,
    sanitizeString
};
