// === ФУНКЦИИ ДЛЯ SOCKET.IO ===

// Подключение к Socket.IO
window.socket = io();

function initializeSocketEvents() {
    // Обработка события начала рисования от других пользователей
    socket.on('draw start', (data) => {
        console.log('Получено событие draw start:', data);
        // Создаем путь от другого пользователя
        const path = new paper.Path();
        path.strokeColor = data.color;
        path.strokeWidth = data.size;
        path.strokeCap = 'round';
        path.add(new paper.Point(data.x, data.y));
        
        // Помечаем, что это путь от другого пользователя
        path.data.isRemote = true;
    });

    // Обработка события продолжения рисования от других пользователей
    socket.on('draw continue', (data) => {
        console.log('Получено событие draw continue:', data);
        // Находим последний путь от этого пользователя
        const paths = paper.project.activeLayer.children;
        for (let i = paths.length - 1; i >= 0; i--) {
            if (paths[i].data.isRemote) {
                paths[i].add(new paper.Point(data.x, data.y));
                break;
            }
        }
    });

    // Обработка события очистки canvas от других пользователей
    socket.on('clear canvas', () => {
        console.log('Получено событие clear canvas');
        paper.project.activeLayer.removeChildren();
    });

    // Обработка подключения
    socket.on('connect', () => {
        console.log('Подключен к серверу');
    });

    // Обработка отключения
    socket.on('disconnect', () => {
        console.log('Отключен от сервера');
    });
}

// Функция для отправки данных рисования на сервер
function sendDrawingData(type, point) {
    const data = {
        x: point.x,
        y: point.y,
        color: currentPath ? currentPath.strokeColor.toCSS() : currentColorLMB,
        size: pencilSize,
        tool: currentTool
    };
    
    socket.emit(type, data);
}