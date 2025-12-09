/**
 * Компонент модальных окон
 */

class ModalManager {
    constructor() {
        this.activeModal = null;
        this.init();
    }

    /**
     * Инициализация менеджера модальных окон
     */
    init() {
        // Закрытие по клику на overlay
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.close();
            }
        });

        // Закрытие по клавише Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModal) {
                this.close();
            }
        });
    }

    /**
     * Создание модального окна
     * @param {Object} options - опции модального окна
     * @returns {HTMLElement} созданное модальное окно
     */
    create(options = {}) {
        const {
            title = '',
            content = '',
            size = 'md',
            theme = '',
            closable = true,
            footer = null
        } = options;

        // Создаем overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        // Создаем модальное окно
        const modal = document.createElement('div');
        modal.className = `modal modal-${size}`;
        if (theme) modal.classList.add(`modal-${theme}`);

        // Создаем заголовок
        const header = document.createElement('div');
        header.className = 'modal-header';

        const titleElement = document.createElement('h2');
        titleElement.className = 'modal-title';
        titleElement.textContent = title;
        header.appendChild(titleElement);

        if (closable) {
            const closeButton = document.createElement('button');
            closeButton.className = 'modal-close';
            closeButton.innerHTML = '<i class="fas fa-times"></i>';
            closeButton.onclick = () => this.close();
            header.appendChild(closeButton);
        }

        modal.appendChild(header);

        // Создаем тело
        const body = document.createElement('div');
        body.className = 'modal-body';

        if (typeof content === 'string') {
            body.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            body.appendChild(content);
        }

        modal.appendChild(body);

        // Создаем футер если указан
        if (footer) {
            const footerElement = document.createElement('div');
            footerElement.className = 'modal-footer';

            if (typeof footer === 'string') {
                footerElement.innerHTML = footer;
            } else if (footer instanceof HTMLElement) {
                footerElement.appendChild(footer);
            }

            modal.appendChild(footerElement);
        }

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        return modal;
    }

    /**
     * Показать модальное окно
     * @param {Object} options - опции модального окна
     * @returns {HTMLElement} созданное модальное окно
     */
    show(options = {}) {
        // Закрываем предыдущее модальное окно
        if (this.activeModal) {
            this.close();
        }

        const modal = this.create(options);
        const overlay = modal.parentElement;

        // Показываем с анимацией
        setTimeout(() => {
            overlay.classList.add('active');
        }, 10);

        this.activeModal = modal;
        return modal;
    }

    /**
     * Закрыть активное модальное окно
     */
    close() {
        if (!this.activeModal) return;

        const overlay = this.activeModal.parentElement;
        overlay.classList.remove('active');

        // Удаляем после анимации
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 300);

        this.activeModal = null;
    }

    /**
     * Показать модальное окно подтверждения
     * @param {string} title - заголовок
     * @param {string} message - сообщение
     * @param {Function} onConfirm - callback при подтверждении
     * @param {Function} onCancel - callback при отмене
     */
    confirm(title, message, onConfirm, onCancel) {
        const footer = document.createElement('div');
        footer.className = 'flex flex-end spacing-md';

        const cancelButton = document.createElement('button');
        cancelButton.className = 'btn-secondary';
        cancelButton.textContent = 'Отмена';
        cancelButton.onclick = () => {
            this.close();
            if (onCancel) onCancel();
        };

        const confirmButton = document.createElement('button');
        confirmButton.className = 'btn-primary';
        confirmButton.textContent = 'Подтвердить';
        confirmButton.onclick = () => {
            this.close();
            if (onConfirm) onConfirm();
        };

        footer.appendChild(cancelButton);
        footer.appendChild(confirmButton);

        return this.show({
            title,
            content: `<p>${message}</p>`,
            footer,
            theme: 'warning'
        });
    }

    /**
     * Показать модальное окно с сообщением
     * @param {string} title - заголовок
     * @param {string} message - сообщение
     * @param {string} type - тип сообщения (info, success, error, warning)
     */
    alert(title, message, type = 'info') {
        const footer = document.createElement('div');
        footer.className = 'flex flex-end';

        const okButton = document.createElement('button');
        okButton.className = 'btn-primary';
        okButton.textContent = 'OK';
        okButton.onclick = () => this.close();

        footer.appendChild(okButton);

        return this.show({
            title,
            content: `<p>${message}</p>`,
            footer,
            theme: type
        });
    }
}

// Создаем глобальный экземпляр
const modalManager = new ModalManager();

// Экспортируем для глобального использования
window.Modal = {
    show: (options) => modalManager.show(options),
    close: () => modalManager.close(),
    confirm: (title, message, onConfirm, onCancel) => modalManager.confirm(title, message, onConfirm, onCancel),
    alert: (title, message, type) => modalManager.alert(title, message, type)
};
