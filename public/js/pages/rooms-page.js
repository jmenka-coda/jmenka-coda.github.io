let socket;
let rooms = [];

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeSocket();
    setupEventListeners();
    loadRooms();
});

// Инициализация Socket.IO
function initializeSocket() {
    socket = io();

    socket.on('connect', () => {
        console.log('Подключен к серверу');
    });

    socket.on('disconnect', () => {
        console.log('Отключен от сервера');
    });

    socket.on('rooms list', (data) => {
        rooms = data.rooms || [];
        displayRooms(rooms);
    });
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Создание комнаты
    document.getElementById('createRoomBtn').addEventListener('click', createRoom);
    document.getElementById('newRoomName').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            createRoom();
        }
    });

    // Присоединение к комнате
    document.getElementById('joinRoomBtn').addEventListener('click', joinRoom);
    document.getElementById('joinRoomName').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            joinRoom();
        }
    });
}

// Загрузка списка комнат
function loadRooms() {
    socket.emit('get rooms');
}

// Создание новой комнаты
function createRoom() {
    const roomName = document.getElementById('newRoomName').value.trim();

    if (!roomName) {
        showError('Введите название комнаты');
        return;
    }

    if (roomName.length < 2) {
        showError('Название комнаты должно содержать минимум 2 символа');
        return;
    }

    if (roomName.length > 50) {
        showError('Название комнаты не должно превышать 50 символов');
        return;
    }

    // Проверяем, не существует ли уже комната с таким именем
    if (rooms.some(room => room.name.toLowerCase() === roomName.toLowerCase())) {
        showError('Комната с таким названием уже существует');
        return;
    }

    // Создаем комнату на сервере (присоединяемся к ней временно для инициализации)
    socket.emit('create room', { room: roomName });

    // Показываем уведомление об успехе
    showSuccess(`Комната "${roomName}" создана!`);

    // Обновляем список комнат
    loadRooms();

    // Переходим к странице рисования
    setTimeout(() => goToDrawingPage(roomName), 1000);
}

// Присоединение к существующей комнате
function joinRoom() {
    const roomName = document.getElementById('joinRoomName').value.trim();

    if (!roomName) {
        showError('Введите название комнаты');
        return;
    }

    goToDrawingPage(roomName);
}

// Переход к странице рисования
function goToDrawingPage(roomName) {
    if (!rooms.some(room => room.name.toLowerCase() === roomName.toLowerCase())) {
        showError('Комната с таким названием не найдена!');
        return;
    }

    // Сохраняем выбранную комнату в localStorage
    localStorage.setItem('selectedRoom', roomName);    

    // Переходим к странице рисования с параметром комнаты
    window.location.href = `/drawing?room=${encodeURIComponent(roomName)}`;
}

// Отображение списка комнат
function displayRooms(roomsList) {
    const roomsGrid = document.getElementById('roomsList');

    if (roomsList.length === 0) {
        roomsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <p>Пока нет активных комнат</p>
                <p>Создайте первую комнату!</p>
            </div>
        `;
        return;
    }

    roomsGrid.innerHTML = roomsList.map(room => `
        <div class="room-card" onclick="joinRoomFromCard('${room.name}')">
            <div>
                <h3>${escapeHtml(room.name)}</h3>
                <div class="room-info">
                    <i class="fas fa-users"></i> ${room.userCount || 0} ${getUsersText(room.userCount || 0)}
                </div>
            </div>
            <button class="join-btn" onclick="joinRoomFromCard('${room.name}'); event.stopPropagation();">
                <i class="fas fa-sign-in-alt"></i> Присоединиться
            </button>
        </div>
    `).join('');
}

// Присоединение к комнате из карточки
function joinRoomFromCard(roomName) {
    goToDrawingPage(roomName);
}

// Получение текста для количества пользователей
function getUsersText(count) {
    if (count === 0) return 'пользователей';
    if (count === 1) return 'пользователь';
    if (count < 5) return 'пользователя';
    return 'пользователей';
}

// Показать ошибку
function showError(message) {
    Toast.error(message);
}

// Показать успех
function showSuccess(message) {
    Toast.success(message);
}

// Экранирование HTML символов
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Обновление списка комнат каждые 30 секунд
setInterval(loadRooms, 30000);
