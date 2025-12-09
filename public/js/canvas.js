import { initPencilTool } from './tools/pencil-tool.js';
import { initEraserTool } from './tools/eraser-tool.js';
import { initHandTool } from './tools/hand-tool.js';
import { applyCanvasTransform, zoomCanvas } from './canvas-transform.js';
import { setTool } from './tool-manager.js';

document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM загружен');

    if (typeof paper !== 'undefined') {
        initializeCanvas();
        initializeSocketEvents();
    } else {
        console.error('Paper.js не загружен');
    }
});

function initializeCanvas() {
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

    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.cursor = 'default';

    paper.setup(canvas);
    console.log('Canvas инициализирован, размер:', canvas.width, 'x', canvas.height);

    applyCanvasTransform();

    setTool('pencil');


    canvas.addEventListener('contextmenu', function (e) {
        e.preventDefault();
    });


    window.currentColorLMB = document.getElementById('colorPickerLMB').value;
    window.currentColorRMB = document.getElementById('colorPickerRMB').value;
    window.pencilSize = parseInt(document.getElementById('pencilSize').value);

    initPencilTool();
    initEraserTool();
    initHandTool();

    setTool('pencil');
    window.changePencilSize(document.getElementById('pencilSize').value);
}
