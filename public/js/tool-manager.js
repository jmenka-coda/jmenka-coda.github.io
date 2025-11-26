// Модуль управления инструментами

import { activatePencil } from './tools/pencil-tool.js';
import { activateEraser } from './tools/eraser-tool.js';
import { activateHand } from './tools/hand-tool.js';

// Глобальные переменные для настроек инструментов
window.currentTool = 'pencil';
window.currentColorLMB = '#000000';
window.currentColorRMB = '#ffffff';
window.pencilSize = 5;

// Функция для установки активного инструмента
export function setTool(toolName) {
    console.log('Активируем инструмент:', toolName);
    window.currentTool = toolName;

    const canvas = document.getElementById('myCanvas');
    if (!canvas) return;

    // Обновляем активные кнопки
    document.querySelectorAll('.icon-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const activeButtons = document.querySelectorAll(`[onclick="setTool('${toolName}')"]`);
    activeButtons.forEach(btn => {
        btn.classList.add('active');
    });

    // Активируем соответствующий инструмент
    if (toolName === 'pencil') {
        activatePencil();
    } else if (toolName === 'eraser') {
        activateEraser();
    } else if (toolName === 'hand') {
        activateHand();
    } else {
        console.error('Инструмент не найден:', toolName);
    }
}

// Функция для изменения цвета левой кнопки мыши
export function changeColorL(color) {
    window.currentColorLMB = color;
    console.log('Цвет ЛКМ изменен на:', color);
}

// Функция для изменения цвета правой кнопки мыши
export function changeColorR(color) {
    window.currentColorRMB = color;
    console.log('Цвет ПКМ изменен на:', color);
}

// Функция для изменения размера кисти
export function changePencilSize(size) {
    window.pencilSize = parseInt(size);
    document.getElementById('sizeValue').textContent = size + 'px';
    console.log('Размер кисти изменен на:', window.pencilSize);
}

// Экспорт функций в глобальную область для использования из HTML
window.setTool = setTool;
window.changeColorL = changeColorL;
window.changeColorR = changeColorR;
window.changePencilSize = changePencilSize;

