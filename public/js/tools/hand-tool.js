// Модуль инструмента "Рука" (перемещение canvas)

let toolHand;
let isDragging = false;
let lastX = 0;
let lastY = 0;

// Инициализация инструмента рука
export function initHandTool() {
    toolHand = new paper.Tool();
    
    toolHand.onMouseDown = function (event) {
        isDragging = true;
        lastX = event.event.clientX;
        lastY = event.event.clientY;
        const canvas = document.getElementById('myCanvas');
        if (canvas) {
            canvas.style.cursor = 'grabbing';
        }
    }

    toolHand.onMouseDrag = function (event) {
        if (isDragging) {
            const dx = event.event.clientX - lastX;
            const dy = event.event.clientY - lastY;

            // Перемещаем canvas
            window.canvasTransform.x += dx;
            window.canvasTransform.y += dy;

            lastX = event.event.clientX;
            lastY = event.event.clientY;

            // Применяем трансформации к canvas элементу
            window.applyCanvasTransform();
        }
    }

    toolHand.onMouseUp = function (event) {
        isDragging = false;
        const canvas = document.getElementById('myCanvas');
        if (canvas) {
            canvas.style.cursor = 'grab';
        }
    }

    return toolHand;
}

// Получить текущий инструмент
export function getHandTool() {
    return toolHand;
}

// Активировать инструмент рука
export function activateHand() {
    if (toolHand) {
        toolHand.activate();
        const canvas = document.getElementById('myCanvas');
        if (canvas) {
            canvas.style.cursor = 'grab';
        }
        console.log('Рука активирована');
    }
}

