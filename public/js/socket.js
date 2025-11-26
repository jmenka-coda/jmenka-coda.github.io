// === ФУНКЦИИ ДЛЯ SOCKET.IO ===

// Подключение к Socket.IO
window.socket = io();
const remoteStrokes = new Map(); // ключ: `${userId}:${strokeId || ''}`

function initializeSocketEvents() {
    // Обработка события начала рисования от других пользователей
    socket.on('draw start', (data) => {
        mydata = data.data;
        console.log(data);
        console.log(mydata);

        const key = `${data.userId}:${mydata.strokeId || ''}`;
        const path = new paper.Path();
        path.strokeColor = mydata.color;
        path.strokeWidth = mydata.size;
        path.strokeCap = 'round';
        path.add(new paper.Point(mydata.x, mydata.y));
        remoteStrokes.set(key, path);
    });

    // Обработка события продолжения рисования от других пользователей
    socket.on('draw continue', (data) => {
        console.log('Получено событие draw continue:', data);
        // Находим последний путь от этого пользователя
        /* const paths = paper.project.activeLayer.children;
        for (let i = paths.length - 1; i >= 0; i--) {
            if (paths[i].data.isRemote) {
                paths[i].add(new paper.Point(data.x, data.y));
                break;
            }
        }*/
        mydata = data.data;

        const key = `${data.userId}:${mydata.strokeId || ''}`;
        const path = remoteStrokes.get(key);
        if (path) path.add(new paper.Point(mydata.x, mydata.y));
    });

    socket.on('draw end', (data) => {
        const key = `${data.userId}:${data.data.strokeId || ''}`;
        remoteStrokes.delete(key);
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
function sendDrawingData(type, point, strokeId, color, size) {
    const data = {
        x: point.x,
        y: point.y,
        color: color,
        size: size,
        tool: window.currentTool,
        strokeId,
    };
    socket.emit(type, data);
}

// Экспорт в глобальную область для использования инструментами
window.sendDrawingData = sendDrawingData;