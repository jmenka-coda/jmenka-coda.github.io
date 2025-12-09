let toolHand;
let isDragging = false;
let lastX = 0;
let lastY = 0;

export function initHandTool() {
    toolHand = new paper.Tool();

    toolHand.onMouseDown = function (event) {
        let eventDown = event.event;
        if (eventDown.type === "touchstart") {
            if (eventDown.touches.length === 1) {
                const touch = eventDown.touches[0];
                startDrag(touch.clientX, touch.clientY);
                eventDown.preventDefault();
            }
        }
        else{
            startDrag(eventDown.clientX, eventDown.clientY);
        }
    }

    toolHand.onMouseDrag = function (event) {
        let eventDrag = event.event;
        if (eventDrag.type === "touchmove") {
            if (isDragging && eventDrag.touches.length === 1) {
                const touch = eventDrag.touches[0];
                handleDrag(touch.clientX, touch.clientY);
                eventDrag.preventDefault();
            }
        }else{
            handleDrag(eventDrag.clientX, eventDrag.clientY);
        }
    }

    toolHand.onMouseUp = function (event) {
        let eventUp = event.event;
        if (eventUp.type === "touchstart") {
            if (eventUp.touches.length === 0) {
                endDrag();
            }
        }else{
            endDrag();
        }
    }

    return toolHand;
}

function startDrag(clientX, clientY) {
    isDragging = true;
    lastX = clientX;
    lastY = clientY;

    const canvas = document.getElementById('myCanvas');
    if (canvas) {
        canvas.style.cursor = 'grabbing';
        canvas.style.touchAction = 'none';
    }

    console.log(`start grab: ${lastX}; ${lastY}`);
}

function handleDrag(clientX, clientY) {
    if (!isDragging) return;

    const dx = clientX - lastX;
    const dy = clientY - lastY;

    if (window.canvasTransform) {
        window.canvasTransform.x += dx;
        window.canvasTransform.y += dy;
    }

    lastX = clientX;
    lastY = clientY;

    if (window.applyCanvasTransform) {
        window.applyCanvasTransform();
    } else {
        const canvas = document.getElementById('myCanvas');
        if (canvas && window.canvasTransform) {
            canvas.style.transform = `translate(${window.canvasTransform.x}px, ${window.canvasTransform.y}px) scale(${window.canvasTransform.scale})`;
        }
    }
}

function endDrag() {
    isDragging = false;
    const canvas = document.getElementById('myCanvas');
    if (canvas) {
        canvas.style.cursor = 'grab';
        canvas.style.touchAction = 'auto';
    }
}

export function getHandTool() {
    return toolHand;
}

export function activateHand() {
    if (toolHand) {
        toolHand.activate();
        const canvas = document.getElementById('myCanvas');
        if (canvas) {
            canvas.style.cursor = 'grab';
            canvas.style.touchAction = 'none';
        }
        console.log('Рука активирована');
    }
}

export function deactivateHand() {
    const canvas = document.getElementById('myCanvas');
    if (canvas) {
        canvas.style.touchAction = 'auto'; 
    }
}