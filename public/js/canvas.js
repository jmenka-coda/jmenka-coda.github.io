// Главный модуль инициализации canvas
import { initPencilTool } from './tools/pencil-tool.js';
import { initEraserTool } from './tools/eraser-tool.js';
import { initHandTool } from './tools/hand-tool.js';
import { applyCanvasTransform, zoomCanvas } from './canvas-transform.js';
import { setTool } from './tool-manager.js';

// Ждем загрузки DOM и Paper.js
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM загружен');
    // Проверяем, что Paper.js загружен
    if (typeof paper !== 'undefined') {
        initializeCanvas();
        initializeSocketEvents();
    } else {
        console.error('Paper.js не загружен');
    }
});

function initializeCanvas() {
    // Получаем элемент canvas
    const canvas = document.getElementById('myCanvas');
    const container = canvas.closest('.canvas-container');

    if (!canvas) {
        console.error('Canvas элемент не найден!');
        return;
    }

    if (!container) {
        console.error('Canvas контейнер не найден!');
        return;
    }

    console.log('Canvas найден:', canvas);
    console.log('Контейнер найден:', container);

    // Устанавливаем стили для контейнера и canvas
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.cursor = 'default';

    // Устанавливаем размер canvas в зависимости от размера контейнера
    function resizeCanvas() {
        // Переинициализируем Paper.js с новым размером
        paper.setup(canvas);
        console.log('Canvas инициализирован, размер:', canvas.width, 'x', canvas.height);

        // Применяем текущие трансформации к позиции canvas
        applyCanvasTransform();

        // Активируем карандаш по умолчанию
        setTool('pencil');
    }

    // Устанавливаем размер при загрузке
    resizeCanvas();

    // Отключаем контекстное меню на canvas для корректной работы ПКМ
    canvas.addEventListener('contextmenu', function (e) {
        e.preventDefault();
    });

    // Обработчик колесика мыши для масштабирования
    // container.addEventListener('wheel', function (e) {
    //     e.preventDefault();
    //     const delta = e.deltaY > 0 ? -1 : 1;
    //     zoomCanvas(delta, e.clientX, e.clientY);
    // });

    // Инициализируем глобальные переменные
    window.currentColorLMB = document.getElementById('colorPickerLMB').value;
    window.currentColorRMB = document.getElementById('colorPickerRMB').value;
    window.pencilSize = parseInt(document.getElementById('pencilSize').value);

    // Инициализируем инструменты для рисования
    initPencilTool();
    initEraserTool();
    initHandTool();

    // Устанавливаем начальный инструмент и размер
    setTool('pencil');
    window.changePencilSize(document.getElementById('pencilSize').value);
}
