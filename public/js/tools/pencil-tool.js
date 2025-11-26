// Модуль инструмента "Карандаш"

let toolPencil;
let currentPath;
let currentStrokeId = null;

// Инициализация инструмента карандаш
export function initPencilTool() {
    toolPencil = new paper.Tool();
    
    toolPencil.onMouseDown = function (event) {
        console.log('Mouse down на canvas, button:', event.event.button, 'координаты:', event.event.clientX, event.event.clientY);

        // Используем point из Paper.js события, который уже нормализован
        let transformedPoint;

        // Пробуем оба способа получения координат
        if (event.point && !isNaN(event.point.x) && !isNaN(event.point.y)) {
            // Используем встроенные координаты Paper.js
            transformedPoint = event.point;
            console.log('Используем Paper.js point:', transformedPoint);
        } else {
            // Используем нашу функцию преобразования
            transformedPoint = window.getTransformedPoint(event.event.clientX, event.event.clientY);
            console.log('Используем преобразованные координаты:', transformedPoint);
        }

        // Проверяем валидность точки
        if (!transformedPoint || isNaN(transformedPoint.x) || isNaN(transformedPoint.y)) {
            console.error('Некорректная точка после преобразования');
            return;
        }

        // Создаем новый путь
        currentPath = new paper.Path();

        const nativeEvent = event.event;

        if (nativeEvent.button == 0) {
            currentPath.strokeColor = window.currentColorLMB;
            console.log('ЛКМ - цвет:', window.currentColorLMB);
        } else if (nativeEvent.button == 2) {
            currentPath.strokeColor = window.currentColorRMB;
            console.log('ПКМ - цвет:', window.currentColorRMB);
        } else {
            currentPath.strokeColor = window.currentColorLMB;
            console.log('Другая кнопка, используется ЛКМ цвет', event);
        }

        currentPath.strokeWidth = window.pencilSize;
        currentPath.strokeCap = 'round';

        // Добавляем первую точку
        currentPath.add(transformedPoint);

        // Отправляем данные на сервер
        currentStrokeId = (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
        window.sendDrawingData('draw start', transformedPoint, currentStrokeId, currentPath.strokeColor.toCSS(), currentPath.strokeWidth);
    }

    toolPencil.onMouseDrag = function (event) {
        if (currentPath) {
            let transformedPoint;

            if (event.point && !isNaN(event.point.x) && !isNaN(event.point.y)) {
                transformedPoint = event.point;
            } else {
                transformedPoint = window.getTransformedPoint(event.event.clientX, event.event.clientY);
            }

            if (!transformedPoint || isNaN(transformedPoint.x) || isNaN(transformedPoint.y)) {
                console.error('Некорректная точка в onMouseDrag');
                return;
            }

            currentPath.add(transformedPoint);
            window.sendDrawingData('draw continue', transformedPoint, currentStrokeId, currentPath.strokeColor.toCSS(), currentPath.strokeWidth);
        }
    }

    return toolPencil;
}

// Получить текущий инструмент
export function getPencilTool() {
    return toolPencil;
}

// Активировать инструмент карандаш
export function activatePencil() {
    if (toolPencil) {
        toolPencil.activate();
        const canvas = document.getElementById('myCanvas');
        if (canvas) {
            canvas.style.cursor = 'crosshair';
        }
        console.log('Карандаш активирован');
    }
}

