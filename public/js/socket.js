
window.socket = io();
const remoteStrokes = new Map();
let currentRoom = localStorage.getItem('drawingRoom') || 'default';

function initializeSocketEvents() {
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

    socket.on('draw continue', (data) => {
        console.log('Получено событие draw continue:', data);
 
        mydata = data.data;

        const key = `${data.userId}:${mydata.strokeId || ''}`;
        const path = remoteStrokes.get(key);
        if (path) path.add(new paper.Point(mydata.x, mydata.y));
    });

    socket.on('draw end', (data) => {
        // Штрих завершен, но путь остается на canvas
        // Удаляем из Map только если это не наш собственный штрих
        // (собственные штрихи уже нарисованы локально и не нужны в remoteStrokes)
        const key = `${data.userId}:${data.data.strokeId || ''}`;
        // Не удаляем, чтобы штрих остался видимым для всех
        // remoteStrokes.delete(key);
      });

    socket.on('clear canvas', () => {
        console.log('Очистка canvas');
        clearCanvas();
    });

    socket.on('room state', (data) => {
        console.log('Получено состояние комнаты:', data);
        if (data && data.strokes && Array.isArray(data.strokes)) {
            clearCanvas();
            data.strokes.forEach(stroke => {
                const key = `${stroke.userId}:${stroke.strokeId || ''}`;
                const path = new paper.Path();
                path.strokeColor = stroke.color;
                path.strokeWidth = stroke.size;
                path.strokeCap = 'round';
                stroke.points.forEach(point => {
                    path.add(new paper.Point(point.x, point.y));
                });
                remoteStrokes.set(key, path);
            });
        }
    });

    socket.on('connect', () => {
        console.log('Подключен к серверу');
        joinRoom(currentRoom);
    });

    socket.on('room joined', (payload) => {
        const room = payload?.room || currentRoom;
        currentRoom = room;
        window.currentRoom = room;
        const status = document.getElementById('roomStatus');
        if (status) {
            status.textContent = `Комната: ${room}`;
        }
        // Запрашиваем состояние комнаты
        socket.emit('request room state', { room });
    });

    socket.on('disconnect', () => {
        console.log('Отключен от сервера');
    });
}

function clearCanvas() {
    // Очищаем все удаленные удаленные штрихи
    remoteStrokes.forEach(path => {
        if (path && path.remove) {
            path.remove();
        }
    });
    remoteStrokes.clear();
    
    // Очищаем все локальные пути на canvas
    if (typeof paper !== 'undefined' && paper.project) {
        paper.project.activeLayer.removeChildren();
    }
}

function joinRoom(roomName) {
    const room = (roomName || 'default').trim() || 'default';
    
    // Очищаем холст перед сменой комнаты
    if (currentRoom !== room) {
        clearCanvas();
    }
    
    currentRoom = room;
    window.currentRoom = room;
    localStorage.setItem('drawingRoom', room);
    socket.emit('join room', { room });
}

function joinRoomFromUI() {
    const input = document.getElementById('roomInput');
    const room = input?.value || 'default';
    joinRoom(room);
}

function createNewRoom() {
    // Генерируем случайное имя комнаты
    const randomId = Math.random().toString(36).substring(2, 8);
    const roomName = `room-${randomId}`;
    
    const input = document.getElementById('roomInput');
    if (input) {
        input.value = roomName;
    }
    joinRoom(roomName);
}

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('roomInput');
    if (input) {
        input.value = currentRoom;
    }
    const status = document.getElementById('roomStatus');
    if (status) {
        status.textContent = `Комната: ${currentRoom}`;
    }
});

function sendDrawingData(type, point, strokeId, color, size) {
    if (window.currentTool === 'eraser'){
        color = 'rgb(255, 255, 255)'
    }

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

window.sendDrawingData = sendDrawingData;
window.joinRoomFromUI = joinRoomFromUI;
window.createNewRoom = createNewRoom;
window.clearCanvas = clearCanvas;

// Инициализация событий при загрузке
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSocketEvents);
} else {
    initializeSocketEvents();
}