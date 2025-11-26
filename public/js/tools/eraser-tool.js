// Модуль инструмента "Ластик"

let toolEraser;
let currentPath;
let currentStrokeId = null;

// Инициализация инструмента ластик
export function initEraserTool() {
    toolEraser = new paper.Tool();
    
    toolEraser.onMouseDown = function (event) {
        console.log('Ластик: Mouse down');

        let transformedPoint;
        if (event.point && !isNaN(event.point.x) && !isNaN(event.point.y)) {
            transformedPoint = event.point;
        } else {
            transformedPoint = window.getTransformedPoint(event.event.clientX, event.event.clientY);
        }

        if (!transformedPoint || isNaN(transformedPoint.x) || isNaN(transformedPoint.y)) {
            console.error('Некорректная точка для ластика');
            return;
        }

        currentPath = new paper.Path();
        currentPath.strokeColor = 'white';
        currentPath.strokeWidth = window.pencilSize;
        currentPath.strokeCap = 'square';
        currentPath.strokeJoin = 'miter';

        currentPath.add(transformedPoint);

        currentStrokeId = (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
        window.sendDrawingData('draw start', transformedPoint, currentStrokeId);
    }

    toolEraser.onMouseDrag = function (event) {
        if (currentPath) {
            let transformedPoint;
            if (event.point && !isNaN(event.point.x) && !isNaN(event.point.y)) {
                transformedPoint = event.point;
            } else {
                transformedPoint = window.getTransformedPoint(event.event.clientX, event.event.clientY);
            }

            if (!transformedPoint || isNaN(transformedPoint.x) || isNaN(transformedPoint.y)) {
                return;
            }

            currentPath.add(transformedPoint);
            window.sendDrawingData('draw continue', transformedPoint, currentStrokeId);
        }
    }

    return toolEraser;
}

// Получить текущий инструмент
export function getEraserTool() {
    return toolEraser;
}

// Активировать инструмент ластик
export function activateEraser() {
    if (toolEraser) {
        toolEraser.activate();
        const canvas = document.getElementById('myCanvas');
        if (canvas) {
            canvas.style.cursor = 'cell';
        }
        console.log('Ластик активирован');
    }
}

