
window.socket = io();
const remoteStrokes = new Map();

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
        const key = `${data.userId}:${data.data.strokeId || ''}`;
        remoteStrokes.delete(key);
      });

    socket.on('connect', () => {
        console.log('Подключен к серверу');
    });

    socket.on('disconnect', () => {
        console.log('Отключен от сервера');
    });
}

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