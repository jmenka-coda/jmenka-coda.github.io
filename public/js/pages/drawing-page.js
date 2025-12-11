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

    // Сохраняем комнату в localStorage
    localStorage.setItem('drawingRoom', roomName);
    localStorage.setItem('selectedRoom', roomName);

    // Обновляем статус комнаты
    const roomStatus = document.getElementById('roomStatus');
    if (roomStatus) {
        roomStatus.textContent = `Комната: ${roomName}`;
    }

    // Автоматически присоединяемся к комнате
    setTimeout(() => {
        if (window.joinRoom) {
            // Проверяем, есть ли сохраненный пароль для этой комнаты
            const savedPassword = localStorage.getItem(`roomPassword_${roomName}`);
            window.joinRoom(roomName, savedPassword);
        }
    }, 100);
});

// Функция для перехода на страницу выбора комнат
function goToRooms() {
    window.location.href = '/rooms';
}

// Экспортируем функцию для глобального доступа
window.goToRooms = goToRooms;
