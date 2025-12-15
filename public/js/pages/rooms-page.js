let socket;
let rooms = [];
let currentUser = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeUser();
    initializeSocket();
    setupEventListeners();
    loadRooms();
});

// Инициализация пользователя
async function initializeUser() {
    try {
        const response = await fetch('/api/user');
        const userData = await response.json();

        if (response.ok) {
            currentUser = userData;
            updateUserDisplay();
            document.getElementById('userNickname').value = currentUser.nickname;
        } else {
            console.error('Ошибка получения пользователя:', userData.error);
        }
    } catch (error) {
        console.error('Ошибка инициализации пользователя:', error);
    }
}

// Инициализация Socket.IO
function initializeSocket() {
    socket = io();

    socket.on('connect', () => {
        console.log('Подключен к серверу');

        // Аутентифицируем пользователя
        if (currentUser) {
            socket.emit('authenticate', { sessionId: getCookie('sessionId') });
        }
    });

    socket.on('disconnect', () => {
        console.log('Отключен от сервера');
    });

    socket.on('authenticated', (data) => {
        console.log('Пользователь аутентифицирован:', data.user);
        currentUser = data.user;
        updateUserDisplay();
    });

    socket.on('authentication error', (data) => {
        console.error('Ошибка аутентификации:', data.error);
    });

    socket.on('rooms list', (data) => {
        rooms = data.rooms || [];
        displayRooms(rooms);
    });

    socket.on('room created', (data) => {
        console.log('Комната создана:', data);
        showSuccess(`Комната "${data.room}" ${data.isPrivate ? '(приватная)' : ''} создана!`);
        loadRooms();
    });

    socket.on('room creation error', (data) => {
        console.error('Ошибка создания комнаты:', data.error);
        showError(data.error);
    });
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Обновление никнейма
    document.getElementById('updateNicknameBtn').addEventListener('click', updateNickname);
    document.getElementById('userNickname').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            updateNickname();
        }
    });

    // Создание комнаты
    document.getElementById('createRoomBtn').addEventListener('click', createRoom);
    document.getElementById('newRoomName').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            createRoom();
        }
    });

    // Чекбокс приватной комнаты
    document.getElementById('roomPrivateCheckbox').addEventListener('change', function(e) {
        const passwordInput = document.getElementById('newRoomPassword');
        passwordInput.style.display = e.target.checked ? 'block' : 'none';
        if (!e.target.checked) {
            passwordInput.value = '';
        }
    });

    // Присоединение к комнате
    document.getElementById('joinRoomBtn').addEventListener('click', joinRoom);
    document.getElementById('joinRoomName').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            joinRoom();
        }
    });

    document.getElementById('loadRoomsBtn').addEventListener('click', loadRooms);
    document.getElementById('loadRoomsBtn').addEventListener('click', function(e){
        if (e.key === 'Enter'){
            loadRooms();
        }
    });

    // Обновление списка при фокусе окна (переключение между вкладками)
    window.addEventListener('focus', function() {
        loadRooms();
    });
}

// Загрузка списка комнат
function loadRooms() {
    if (socket && socket.connected) {
        socket.emit('get rooms');
    } else {
        // Fallback: используем REST API если Socket.IO не подключен
        fetch('/api/rooms')
            .then(response => response.json())
            .then(data => {
                rooms = data.rooms || [];
                displayRooms(rooms);
            })
            .catch(error => {
                console.error('Ошибка загрузки комнат через API:', error);
            });
    }
}

// Обновление никнейма
async function updateNickname() {
    const nicknameInput = document.getElementById('userNickname');
    const newNickname = nicknameInput.value.trim();

    if (!newNickname) {
        showError('Введите никнейм');
        return;
    }

    try {
        const response = await fetch('/api/user/nickname', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nickname: newNickname })
        });

        const result = await response.json();

        if (response.ok) {
            currentUser = result;
            updateUserDisplay();
            showSuccess('Никнейм обновлен!');
        } else {
            showError(result.error || 'Ошибка обновления никнейма');
        }
    } catch (error) {
        console.error('Ошибка обновления никнейма:', error);
        showError('Ошибка обновления никнейма');
    }
}

// Создание новой комнаты
async function createRoom() {
    const roomName = document.getElementById('newRoomName').value.trim();
    const isPrivate = document.getElementById('roomPrivateCheckbox').checked;
    const password = document.getElementById('newRoomPassword').value;

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

    if (isPrivate && !password.trim()) {
        showError('Для приватной комнаты требуется пароль');
        return;
    }

    // Проверяем, не существует ли уже комната с таким именем
    if (rooms.some(room => room.name.toLowerCase() === roomName.toLowerCase())) {
        showError('Комната с таким названием уже существует');
        return;
    }

    try {
        const response = await fetch('/api/rooms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: roomName,
                password: isPrivate ? password : null
            })
        });

        const result = await response.json();

        if (response.ok) {
            // Сохраняем пароль для созданной приватной комнаты
            if (isPrivate && password) {
                localStorage.setItem(`roomPassword_${roomName}`, password);
            }

            // Показываем уведомление об успехе
            showSuccess(`Комната "${roomName}" ${result.isPrivate ? '(приватная)' : ''} создана!`);

            // Очищаем форму
            document.getElementById('newRoomName').value = '';
            document.getElementById('newRoomPassword').value = '';
            document.getElementById('roomPrivateCheckbox').checked = false;
            document.getElementById('newRoomPassword').style.display = 'none';

            // Немедленно обновляем список комнат
            loadRooms();

            // Переходим к странице рисования
            setTimeout(() => goToDrawingPage(roomName), 1500);
        } else {
            showError(result.error || 'Ошибка создания комнаты');
        }
    } catch (error) {
        console.error('Ошибка создания комнаты:', error);
        showError('Ошибка создания комнаты');
    }
}

// Присоединение к существующей комнате
async function joinRoom() {
    const roomName = document.getElementById('joinRoomName').value.trim();
    const password = document.getElementById('joinRoomPassword').value;

    if (!roomName) {
        showError('Введите название комнаты');
        return;
    }

    const room = rooms.find(r => r.name.toLowerCase() === roomName.toLowerCase());
    if (!room) {
        showError('Комната с таким названием не найдена!');
        return;
    }

    // Для приватных комнат требуем пароль
    if (room.isPrivate && !password) {
        showError('Для приватной комнаты требуется пароль');
        return;
    }

    // Сохраняем пароль в localStorage для автоматического подключения
    if (room.isPrivate && password) {
        localStorage.setItem(`roomPassword_${roomName}`, password);
    }

    goToDrawingPage(roomName);
}

// Переход к странице рисования
function goToDrawingPage(roomName) {

    // Сохраняем выбранную комнату в localStorage
    localStorage.setItem('selectedRoom', roomName);    

    // Переходим к странице рисования с параметром комнаты
    window.location.href = `/drawing?room=${encodeURIComponent(roomName)}`;
}

// Обновление отображения пользователя
function updateUserDisplay() {
    const userInfo = document.getElementById('currentUserInfo');
    if (currentUser) {
        userInfo.innerHTML = `
            <div class="user-display">
                <i class="fas fa-user-circle"></i>
                <span>Ваш никнейм: <strong>${escapeHtml(currentUser.nickname)}</strong></span>
            </div>
        `;
    } else {
        userInfo.innerHTML = '<div class="user-display">Загрузка...</div>';
    }
}

// Получение куки по имени
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
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
        <div class="room-card ${room.isPrivate ? 'private-room' : ''}" onclick="joinRoomFromCard('${room.name}')">
            <div>
                <h3>
                    ${escapeHtml(room.name)}
                    ${room.isPrivate ? '<i class="fas fa-lock" title="Приватная комната"></i>' : ''}
                </h3>
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
    const room = rooms.find(r => r.name === roomName);
    if (!room) {
        showError('Комната не найдена');
        return;
    }
    
    // Заполняем форму именем комнаты
    document.getElementById('joinRoomName').value = roomName;
    
    // Если комната приватная, показываем поле пароля
    if (room.isPrivate) {
        document.getElementById('joinRoomPassword').style.display = 'block';
        document.getElementById('joinRoomPassword').focus();
    } else {
        document.getElementById('joinRoomPassword').style.display = 'none';
    }

    joinRoom();
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
