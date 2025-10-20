
// Глобальные переменные для инструментов
let toolPencil, toolEraser, currentTool, currentColorLMB, currentColorRMB, currentPath, pencilSize;

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
    
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

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

    // Устанавливаем размер canvas в зависимости от размера контейнера
    function resizeCanvas() {
        const containerWidth = container.offsetWidth - 40; // учитываем padding контейнера
        const containerHeight = Math.min(containerWidth * 0.6, window.innerHeight * 0.7); // соотношение сторон и ограничение по высоте экрана

        canvas.width = containerWidth;
        canvas.height = containerHeight;

        // Переинициализируем Paper.js с новым размером
        paper.setup(canvas);
        console.log('Canvas инициализирован, размер:', canvas.width, 'x', canvas.height);

        // Активируем карандаш по умолчанию
        setTool('pencil');
    }
    
    // Устанавливаем размер при загрузке
    resizeCanvas();

    // Обновляем размер при изменении размера окна
    window.addEventListener('resize', resizeCanvas);
    
    // Отключаем контекстное меню на canvas для корректной работы ПКМ
    canvas.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });

    // Инициализируем глобальные переменные
    currentTool = 'pencil';
    
    currentColorLMB = document.getElementById('colorPickerLMB').value;
    currentColorRMB = document.getElementById('colorPickerRMB').value;
    currentPath = null;

    // Инструменты для рисования
    toolPencil = new paper.Tool();
    toolEraser = new paper.Tool();
    
    setTool('pencil');
    changePencilSize(document.getElementById('pencilSize').value);
    // Карандаш
    toolPencil.onMouseDown = function (event) {
        console.log('Mouse down на canvas, button:', event.button);
        // Создаем новый путь
        currentPath = new paper.Path();
        
        const nativeEvent = event.event;

        if(nativeEvent.button == 0) {
            // ЛКМ
            currentPath.strokeColor = currentColorLMB;
            console.log('ЛКМ - цвет:', currentColorLMB);
        } else if(nativeEvent.button == 2) {
            //ПКМ
            currentPath.strokeColor = currentColorRMB;
            console.log('ПКМ - цвет:', currentColorRMB);
        } else {
            // Средняя кнопка или другие
            currentPath.strokeColor = currentColorLMB; // по умолчанию
            console.log('Другая кнопка, используется ЛКМ цвет', event);
        }
        
        currentPath.strokeWidth = pencilSize;
        currentPath.strokeCap = 'round';

        // Добавляем первую точку
        currentPath.add(event.point);
        
        // Отправляем данные на сервер
        sendDrawingData('draw start', event.point);
    }

    toolPencil.onMouseDrag = function (event) {
        // Продолжаем путь
        if (currentPath) {
            currentPath.add(event.point);
            
            // Отправляем данные на сервер
            sendDrawingData('draw continue', event.point);
        }
    }

    toolPencil.onMouseUp = function (event) {
        // Сглаживаем путь для красивого вида
        // if (currentPath) {
        //     currentPath.smooth();
        // }
    }

    // Ластик
    toolEraser.onMouseDrag = function (event) {
        // Ищем пути под курсором и удаляем их
        const hitResult = paper.project.hitTest(event.point, {
            tolerance: 10,
            stroke: true
        });

        if (hitResult && hitResult.item) {
            hitResult.item.remove();
        }
    }

}


// Функции переключения инструментов (глобальные)
function setTool(toolName) {
    console.log('Активируем инструмент:', toolName);
    currentTool = toolName;

    // Убираем активный класс у всех кнопок инструментов
    document.querySelectorAll('.icon-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Добавляем активный класс к нажатой кнопке
    const activeButtons = document.querySelectorAll(`[onclick="setTool('${toolName}')"]`);
    activeButtons.forEach(btn => {
        btn.classList.add('active');
    });

    // Активируем инструмент Paper.js
    if (toolName === 'pencil' && toolPencil) {
        toolPencil.activate();
        console.log('Карандаш активирован');
    } else if (toolName === 'eraser' && toolEraser) {
        toolEraser.activate();
        console.log('Ластик активирован');
    } else {
        console.error('Инструмент не найден:', toolName);
    }
}

function changeColorL(color) {
    currentColorLMB = color;
}
function changeColorR(color) {
    currentColorRMB = color;
}

function clearCanvas() {
    paper.project.activeLayer.removeCShildren();
    
    // Отправляем событие очистки на сервер
    socket.emit('clear canvas');
}

function changePencilSize(size) {
    pencilSize = parseInt(size);
    document.getElementById('sizeValue').textContent = size + 'px';
    console.log('Размер кисти изменен на:', pencilSize);
}