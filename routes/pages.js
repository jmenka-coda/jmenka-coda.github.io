/**
 * Маршруты страниц
 */

const express = require('express');
const path = require('path');
const router = express.Router();

/**
 * Главная страница - перенаправление на комнаты
 */
router.get('/', (req, res) => {
    res.redirect('/rooms');
});

/**
 * Страница выбора комнат
 */
router.get('/rooms', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/rooms.html'));
});

/**
 * Страница рисования
 */
router.get('/drawing', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/drawing.html'));
});

module.exports = router;
