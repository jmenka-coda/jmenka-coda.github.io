/**
 * Компонент уведомлений (Toast)
 */

class ToastManager {
    constructor() {
        this.container = null;
        this.init();
    }

    /**
     * Инициализация контейнера для уведомлений
     */
    init() {
        // Для страницы комнат используем специальный контейнер
        const roomsContainer = document.getElementById('toast-notifications');
        if (roomsContainer) {
            this.container = roomsContainer;
            this.container.className = 'toast-container';
            return;
        }

        // Для других страниц используем стандартный подход
        if (!document.querySelector('.toast-container')) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.querySelector('.toast-container');
        }
    }

    /**
     * Показать уведомление
     * @param {string} message - текст уведомления
     * @param {string} type - тип уведомления (success, error, warning, info)
     * @param {number} duration - время отображения в мс (по умолчанию 3000)
     */
    show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `            
            <div class="toast-message">
                <i class="toast-icon ${iconMap[type] || iconMap.info}"></i>
                    ${this.escapeHtml(message)}
                <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
                </button>
            </div>
            
        `;

        this.container.appendChild(toast);

        // Анимация появления
        setTimeout(() => toast.classList.add('show'), 10);

        // Автоматическое скрытие
        if (duration > 0) {
            setTimeout(() => {
                this.hide(toast);
            }, duration);
        }

        return toast;
    }

    /**
     * Скрыть уведомление
     * @param {HTMLElement} toast - элемент уведомления
     */
    hide(toast) {
        if (!toast) return;

        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    /**
     * Показать уведомление об успехе
     * @param {string} message - текст уведомления
     * @param {number} duration - время отображения
     */
    success(message, duration = 3000) {
        return this.show(message, 'success', duration);
    }

    /**
     * Показать уведомление об ошибке
     * @param {string} message - текст уведомления
     * @param {number} duration - время отображения
     */
    error(message, duration = 5000) {
        return this.show(message, 'error', duration);
    }

    /**
     * Показать предупреждение
     * @param {string} message - текст уведомления
     * @param {number} duration - время отображения
     */
    warning(message, duration = 4000) {
        return this.show(message, 'warning', duration);
    }

    /**
     * Показать информационное уведомление
     * @param {string} message - текст уведомления
     * @param {number} duration - время отображения
     */
    info(message, duration = 3000) {
        return this.show(message, 'info', duration);
    }

    /**
     * Экранирование HTML символов
     * @param {string} text - текст для экранирования
     * @returns {string} экранированный текст
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Очистить все уведомления
     */
    clear() {
        const toasts = this.container.querySelectorAll('.toast');
        toasts.forEach(toast => this.hide(toast));
    }
}

// Создаем глобальный экземпляр
const toastManager = new ToastManager();

// Экспортируем для глобального использования
window.Toast = {
    show: (message, type, duration) => toastManager.show(message, type, duration),
    success: (message, duration) => toastManager.success(message, duration),
    error: (message, duration) => toastManager.error(message, duration),
    warning: (message, duration) => toastManager.warning(message, duration),
    info: (message, duration) => toastManager.info(message, duration),
    clear: () => toastManager.clear()
};
