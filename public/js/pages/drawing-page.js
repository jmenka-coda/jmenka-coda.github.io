// Глобальная переменная для текущей комнаты
let currentRoomName = null;

// Логика страницы рисования
document.addEventListener('DOMContentLoaded', function() {
    // Получаем комнату из URL параметров или localStorage
    const urlParams = new URLSearchParams(window.location.search);
    let roomName = urlParams.get('room') || localStorage.getItem('selectedRoom') || localStorage.getItem('drawingRoom');

    if (!roomName) {
        // Если комната не указана, перенаправляем на страницу выбора комнат
        window.location.href = '/rooms';
        return;
    }

    currentRoomName = roomName;

    // Сохраняем комнату в localStorage
    localStorage.setItem('drawingRoom', roomName);
    localStorage.setItem('selectedRoom', roomName);

    // Обновляем статус комнаты
    const roomStatus = document.getElementById('roomStatus');
    if (roomStatus) {
        roomStatus.textContent = `Комната: ${roomName}`;
    }

    // Проверяем информацию о комнате перед присоединением
    checkRoomAndJoin(roomName);
});

// Функция проверки комнаты и присоединения
async function checkRoomAndJoin(roomName) {
    try {
        // Получаем информацию о комнате
        const response = await fetch(`/api/rooms/${encodeURIComponent(roomName)}`);
        const roomInfo = await response.json();

        if (response.ok) {
            // Проверяем, есть ли сохраненный пароль для этой комнаты
            const savedPassword = localStorage.getItem(`roomPassword_${roomName}`);

            // Если комната приватная и нет сохраненного пароля - показываем модальное окно
            if (roomInfo.isPrivate && !savedPassword) {
                showPrivateRoomModal(roomName);
                return;
            }

            // Присоединяемся к комнате
            joinToRoom(roomName, savedPassword);
        } else {
            // Комната не найдена или ошибка - создаем публичную комнату
            console.log('Комната не найдена, присоединяемся:', roomName);
            joinToRoom(roomName, null);
        }
    } catch (error) {
        console.error('Ошибка при проверке комнаты:', error);
        // В случае ошибки пытаемся присоединиться без проверки
        joinToRoom(roomName, null);
    }
}

// Функция присоединения к комнате
function joinToRoom(roomName, password) {
    if (window.joinRoom) {
        window.joinRoom(roomName, password);
    }
}

// Функция для перехода на страницу выбора комнат
function goToRooms() {
    window.location.href = '/rooms';
}

// Показать модальное окно для ввода пароля приватной комнаты
function showPrivateRoomModal(roomName) {
    const modal = document.getElementById('privateRoomModal');
    const roomNameElement = document.getElementById('privateRoomName');
    const passwordInput = document.getElementById('privateRoomPassword');
    const errorElement = document.getElementById('passwordError');

    if (roomNameElement) roomNameElement.textContent = roomName;
    if (passwordInput) passwordInput.value = '';
    if (errorElement) errorElement.style.display = 'none';

    if (modal) {
        modal.classList.add('active');
        // Фокус на поле ввода пароля
        setTimeout(() => {
            if (passwordInput) passwordInput.focus();
        }, 100);
    }
}

// Закрыть модальное окно
function closePrivateRoomModal() {
    const modal = document.getElementById('privateRoomModal');
    if (modal) {
        modal.classList.remove('active');
        // Перенаправляем на страницу выбора комнат через небольшую задержку для анимации
        setTimeout(() => {
            goToRooms();
        }, 300);
    }
}

// Присоединиться к приватной комнате после ввода пароля
async function joinPrivateRoom() {
    const passwordInput = document.getElementById('privateRoomPassword');
    const errorElement = document.getElementById('passwordError');

    const password = passwordInput ? passwordInput.value.trim() : '';

    if (!password) {
        if (errorElement) {
            errorElement.textContent = 'Введите пароль';
            errorElement.style.display = 'block';
        }
        return;
    }

    try {
        // Сохраняем пароль в localStorage
        localStorage.setItem(`roomPassword_${currentRoomName}`, password);

        // Закрываем модальное окно
        closePrivateRoomModal();

        // Присоединяемся к комнате
        joinToRoom(currentRoomName, password);

    } catch (error) {
        console.error('Ошибка при присоединении к комнате:', error);
        if (errorElement) {
            errorElement.textContent = 'Ошибка при присоединении к комнате';
            errorElement.style.display = 'block';
        }
    }
}

// Обработка клавиши Enter в поле пароля
document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('privateRoomPassword');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                joinPrivateRoom();
            }
        });
    }
});

// Экспортируем функции для глобального доступа
window.goToRooms = goToRooms;
window.closePrivateRoomModal = closePrivateRoomModal;
window.joinPrivateRoom = joinPrivateRoom;
