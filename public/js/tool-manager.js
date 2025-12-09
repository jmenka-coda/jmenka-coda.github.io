import { activatePencil } from './tools/pencil-tool.js';
import { activateEraser } from './tools/eraser-tool.js';
import { activateHand } from './tools/hand-tool.js';

window.currentTool = 'pencil';
window.currentColorLMB = '#000000';
window.currentColorRMB = '#ffffff';
window.pencilSize = 5;

export function setTool(toolName) {
    console.log('Активируем инструмент:', toolName);
    window.currentTool = toolName;

    const canvas = document.getElementById('myCanvas');
    if (!canvas) return;

    document.querySelectorAll('.icon-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const activeButtons = document.querySelectorAll(`[onclick="setTool('${toolName}')"]`);
    activeButtons.forEach(btn => {
        btn.classList.add('active');
    });

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

export function changeColorL(color) {
    window.currentColorLMB = color;
    console.log('Цвет ЛКМ изменен на:', color);
}

export function changeColorR(color) {
    window.currentColorRMB = color;
    console.log('Цвет ПКМ изменен на:', color);
}

export function changePencilSize(size) {
    window.pencilSize = parseInt(size);
    document.getElementById('sizeValue').textContent = size + 'px';
    console.log('Размер кисти изменен на:', window.pencilSize);
}

window.setTool = setTool;
window.changeColorL = changeColorL;
window.changeColorR = changeColorR;
window.changePencilSize = changePencilSize;

