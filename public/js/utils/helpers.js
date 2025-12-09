/**
 * Вспомогательные утилиты для клиента
 */

/**
 * Экранирование HTML символов
 * @param {string} text - текст для экранирования
 * @returns {string} экранированный текст
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Генерация случайного ID
 * @param {number} length - длина ID
 * @returns {string} случайный ID
 */
function generateId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Генерация UUID v4
 * @returns {string} UUID
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Дебонсинг функции
 * @param {Function} func - функция для дебона
 * @param {number} wait - время ожидания в мс
 * @returns {Function} дебонированная функция
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Троttлинг функции
 * @param {Function} func - функция для троттлинга
 * @param {number} limit - лимит времени в мс
 * @returns {Function} троттлингованная функция
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Проверка валидности email
 * @param {string} email - email для проверки
 * @returns {boolean} результат проверки
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Форматирование числа с разделителями
 * @param {number} num - число для форматирования
 * @returns {string} отформатированное число
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Получение размера файла в читаемом формате
 * @param {number} bytes - размер в байтах
 * @returns {string} читаемый размер
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Копирование текста в буфер обмена
 * @param {string} text - текст для копирования
 * @returns {Promise<boolean>} результат операции
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        // Fallback для старых браузеров
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        } catch (fallbackErr) {
            document.body.removeChild(textArea);
            return false;
        }
    }
}

/**
 * Получение параметров URL
 * @param {string} name - имя параметра
 * @param {string} url - URL (по умолчанию текущий)
 * @returns {string|null} значение параметра
 */
function getUrlParameter(name, url = window.location.href) {
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
    const results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * Установка параметров URL без перезагрузки страницы
 * @param {Object} params - параметры для установки
 */
function setUrlParameters(params) {
    const url = new URL(window.location);
    Object.keys(params).forEach(key => {
        if (params[key] === null || params[key] === undefined) {
            url.searchParams.delete(key);
        } else {
            url.searchParams.set(key, params[key]);
        }
    });
    window.history.replaceState({}, '', url);
}

/**
 * Проверка поддержки WebSocket
 * @returns {boolean} поддерживается ли WebSocket
 */
function isWebSocketSupported() {
    return 'WebSocket' in window || 'MozWebSocket' in window;
}

/**
 * Проверка поддержки Canvas
 * @returns {boolean} поддерживается ли Canvas
 */
function isCanvasSupported() {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext && canvas.getContext('2d'));
}

/**
 * Получение информации о браузере
 * @returns {Object} информация о браузере
 */
function getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    let version = 'Unknown';

    // Простая проверка браузера
    if (ua.includes('Chrome')) {
        browser = 'Chrome';
        version = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Firefox')) {
        browser = 'Firefox';
        version = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
        browser = 'Safari';
        version = ua.match(/Version\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Edge')) {
        browser = 'Edge';
        version = ua.match(/Edge\/(\d+)/)?.[1] || 'Unknown';
    }

    return {
        browser,
        version,
        userAgent: ua,
        isMobile: /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
        supportsWebSocket: isWebSocketSupported(),
        supportsCanvas: isCanvasSupported()
    };
}

/**
 * Локализация текста (простая реализация)
 * @param {string} key - ключ текста
 * @param {Object} params - параметры для подстановки
 * @returns {string} локализованный текст
 */
function localize(key, params = {}) {
    const messages = {
        'room.created': 'Комната "{name}" создана!',
        'room.joined': 'Вы присоединились к комнате "{name}"',
        'room.not_found': 'Комната не найдена',
        'error.network': 'Ошибка сети. Проверьте подключение к интернету.',
        'error.unknown': 'Произошла неизвестная ошибка'
    };

    let message = messages[key] || key;

    // Подстановка параметров
    Object.keys(params).forEach(param => {
        message = message.replace(new RegExp(`{${param}}`, 'g'), params[param]);
    });

    return message;
}

// Экспортируем утилиты глобально
window.Utils = {
    escapeHtml,
    generateId,
    generateUUID,
    debounce,
    throttle,
    isValidEmail,
    formatNumber,
    formatFileSize,
    copyToClipboard,
    getUrlParameter,
    setUrlParameters,
    isWebSocketSupported,
    isCanvasSupported,
    getBrowserInfo,
    localize
};
