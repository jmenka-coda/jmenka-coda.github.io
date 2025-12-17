const path = require('path');
const { UserManager: DBUserManager, SessionManager } = require('../src/utils/database');

async function showStats() {
    try {
        const stats = await DBUserManager.getStats();
        console.log('Статистика базы данных:');
        console.log(`Пользователей: ${stats.users}`);
        console.log(`Активных сессий: ${stats.sessions}`);
        console.log(`Комнат: ${stats.rooms}`);
        console.log(`Приватных комнат: ${stats.privateRooms}`);
    } catch (error) {
        console.error('Ошибка получения статистики:', error.message);
    }
}

async function cleanup() {
    try {
        console.log('Начинаем очистку...');

        const sessionsCleaned = await SessionManager.cleanExpiredSessions();
        console.log(`Очищено ${sessionsCleaned} просроченных сессий`);

        const roomsCleaned = await DBUserManager.deleteOldRooms(5);
        console.log(`Очищено ${roomsCleaned} старых комнат (старше 5 минут)`);

        console.log('Очистка завершена!');
    } catch (error) {
        console.error('Ошибка очистки:', error.message);
    }
}

async function reset() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('ВНИМАНИЕ: Это удалит ВСЕ данные! Продолжить? (yes/no): ', async (answer) => {
        if (answer.toLowerCase() === 'yes') {
            try {
                console.log('Начинаем сброс базы данных...');

                await SessionManager.deleteAllSessions();
                await DBUserManager.deleteAllRooms();

                // Удаляем всех пользователей
                const db = require('../src/utils/database').db;
                await new Promise((resolve, reject) => {
                    db.run('DELETE FROM users', [], function(err) {
                        if (err) reject(err);
                        else resolve(this.changes);
                    });
                });

                console.log('Все данные удалены!');
            } catch (error) {
                console.error('Ошибка сброса:', error.message);
            }
        } else {
            console.log('Сброс отменен');
        }
        rl.close();
    });
}

function showHelp() {
    console.log(`
Управление SQLite базой данных

Использование: node scripts/database-manager.js [команда]

Команды:
  stats   - Показать статистику базы данных
  cleanup - Очистить просроченные сессии и старые комнаты (5+ мин)
  reset   - Удалить ВСЕ данные (ОПАСНО!)
  help    - Показать эту справку

Примеры:
  node scripts/database-manager.js stats
  node scripts/database-manager.js cleanup
  node scripts/database-manager.js reset

База данных: data/app.db
`);
}

async function main() {
    const command = process.argv[2];

    switch (command) {
        case 'stats':
            await showStats();
            break;
        case 'cleanup':
            await cleanup();
            break;
        case 'reset':
            await reset();
            return; // Не завершаем процесс сразу, ждем ответа пользователя
        case 'help':
        default:
            showHelp();
            break;
    }

    // Завершаем процесс для всех команд кроме reset
    if (command !== 'reset') {
        process.exit(0);
    }
}

main().catch(console.error);
