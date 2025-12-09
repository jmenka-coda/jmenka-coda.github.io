let toolPencil;
let currentPath;
let currentStrokeId = null;

export function initPencilTool() {
    toolPencil = new paper.Tool();
    
    toolPencil.onMouseDown = function (event) {
        console.log('Mouse down на canvas, button:', event.event.button, 'координаты:', event.event.clientX, event.event.clientY);

        let transformedPoint;

        if (event.point && !isNaN(event.point.x) && !isNaN(event.point.y)) {
            transformedPoint = event.point;
            console.log('Используем Paper.js point:', transformedPoint);
        } else {
            transformedPoint = window.getTransformedPoint(event.event.clientX, event.event.clientY);
            console.log('Используем преобразованные координаты:', transformedPoint);
        }

        if (!transformedPoint || isNaN(transformedPoint.x) || isNaN(transformedPoint.y)) {
            console.error('Некорректная точка после преобразования');
            return;
        }

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

        currentPath.add(transformedPoint);

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

export function getPencilTool() {
    return toolPencil;
}

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

