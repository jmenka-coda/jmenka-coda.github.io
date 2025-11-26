// Модуль управления трансформациями canvas (масштабирование, перемещение)

// Глобальный объект трансформаций
window.canvasTransform = {
    x: 0,
    y: 0,
    scale: 1,
    minScale: 0.1,
    maxScale: 5
};

// Функция для применения трансформаций к canvas элементу
export function applyCanvasTransform() {
    const canvas = document.getElementById('myCanvas');
    if (canvas) {
        canvas.style.transform = `translate(${window.canvasTransform.x}px, ${window.canvasTransform.y}px) scale(${window.canvasTransform.scale})`;
        canvas.style.transformOrigin = '0 0';
    }
}

// Экспорт в глобальную область для использования в других модулях
window.applyCanvasTransform = applyCanvasTransform;

// Функция для преобразования координат мыши в координаты canvas с учетом трансформации
export function getTransformedPoint(clientX, clientY) {
    const canvas = document.getElementById('myCanvas');
    const container = canvas.closest('.canvas-container');

    if (!container) {
        console.error('Контейнер не найден');
        return new paper.Point(0, 0);
    }

    const rect = container.getBoundingClientRect();

    // Проверяем валидность координат
    if (isNaN(clientX) || isNaN(clientY)) {
        console.error('Некорректные координаты мыши:', clientX, clientY);
        return new paper.Point(0, 0);
    }

    // Получаем координаты относительно контейнера
    const containerX = clientX - rect.left;
    const containerY = clientY - rect.top;

    // Проверяем, что координаты в пределах видимой области
    if (containerX < 0 || containerY < 0 || containerX > rect.width || containerY > rect.height) {
        console.warn('Координаты вне пределов контейнера:', containerX, containerY);
    }

    // Преобразуем в координаты canvas с учетом трансформаций
    const x = (containerX - window.canvasTransform.x) / window.canvasTransform.scale;
    const y = (containerY - window.canvasTransform.y) / window.canvasTransform.scale;

    console.log('Преобразованные координаты:', { clientX, clientY, containerX, containerY, x, y });

    return new paper.Point(x, y);
}

// Экспорт в глобальную область
window.getTransformedPoint = getTransformedPoint;

// Функция для масштабирования
export function zoomCanvas(delta, centerX, centerY) {
    const canvas = document.getElementById('myCanvas');
    if (!canvas) return;

    const container = canvas.closest('.canvas-container');
    if (!container) return;

    const previousScale = window.canvasTransform.scale;

    // Вычисляем новый масштаб
    window.canvasTransform.scale += delta * 0.1;
    window.canvasTransform.scale = Math.max(window.canvasTransform.minScale,
        Math.min(window.canvasTransform.maxScale, window.canvasTransform.scale));

    // Корректируем позицию для сохранения центра масштабирования
    const rect = container.getBoundingClientRect();
    const containerCenterX = centerX - rect.left;
    const containerCenterY = centerY - rect.top;

    const scaleFactor = window.canvasTransform.scale / previousScale - 1;
    window.canvasTransform.x -= (containerCenterX - window.canvasTransform.x) * scaleFactor;
    window.canvasTransform.y -= (containerCenterY - window.canvasTransform.y) * scaleFactor;

    // Применяем трансформации
    applyCanvasTransform();
}

// Функция для увеличения масштаба
export function zoomIn() {
    const canvas = document.getElementById('myCanvas');
    const container = canvas.closest('.canvas-container');
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    zoomCanvas(1, centerX, centerY);
}

// Функция для уменьшения масштаба
export function zoomOut() {
    const canvas = document.getElementById('myCanvas');
    const container = canvas.closest('.canvas-container');
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    zoomCanvas(-1, centerX, centerY);
}

// Функция для сброса масштаба
export function resetZoom() {
    window.canvasTransform.scale = 1;
    window.canvasTransform.x = 0;
    window.canvasTransform.y = 0;

    const canvas = document.getElementById('myCanvas');
    if (canvas) {
        canvas.style.transform = 'translate(0px, 0px) scale(1)';
    }
}

// Экспорт функций в глобальную область для использования из HTML
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.resetZoom = resetZoom;

