const env = window.electronAPI.env();
const SERVER_URL = "https://platform.citydash.me/api";

// Получаем ссылки на элементы управления
const widthInput = document.getElementById('width');
const heightInput = document.getElementById('height');
const resizeBtn = document.getElementById('resize-btn');

const operatorSelect = document.getElementById('operator_select');
const adObjectSelect = document.getElementById('ad_object_select');
const adObjectButton = document.getElementById('ad_object_button');

const xInput = document.getElementById('x-position');
const yInput = document.getElementById('y-position');
const moveBtn = document.getElementById('move-btn');

const fullscreenBtn = document.getElementById('fullscreen-btn');
const alwaysOnTopCheckbox = document.getElementById('always-on-top');
const backgroundColorInput = document.getElementById('background-color');
const setColorBtn = document.getElementById('set-color-btn');
const reloadBtn = document.getElementById('reload-btn');

const getOperators = async () => {
    const response = await fetch(SERVER_URL + '/player/operators');
    const operators = await response.json();
    console.log("ops", operators);
    return operators;
}

const getAdObjectsOfOperator = async (operatorUuid) => {
    const response = await fetch(SERVER_URL + '/player/ad-objects?operator_uuid=' + operatorUuid);
    const adObjects = await response.json();
    console.log("adObjects", adObjects);
    return adObjects;
}

getOperators()
.then(operators => {
    operatorSelect.innerHTML = '';
    for (const operator of operators) {
        const option = document.createElement('option');
        option.value = operator.uuid;
        option.innerHTML = operator.name;
        operatorSelect.appendChild(option);
    }
});

operatorSelect.addEventListener("change", () => {
    getAdObjectsOfOperator(operatorSelect.value)
    .then(adObjects => {
        adObjectSelect.innerHTML = '';
        for (const adObject of adObjects) {
            const option = document.createElement('option');
            option.value = adObject.uuid;
            option.innerHTML = adObject.name;
            adObjectSelect.appendChild(option);
        }
    });
});

adObjectButton.addEventListener('click', () => {
    window.electronAPI.setAdObject(adObjectSelect.value);
})

// Привязываем события к элементам управления
resizeBtn.addEventListener('click', () => {
    const width = parseInt(widthInput.value);
    const height = parseInt(heightInput.value);
    window.electronAPI.resizeWindow(width, height);
});

moveBtn.addEventListener('click', () => {
    const x = parseInt(xInput.value);
    const y = parseInt(yInput.value);
    window.electronAPI.moveWindow(x, y);
});

fullscreenBtn.addEventListener('click', () => {
    window.electronAPI.toggleFullscreen();
});

alwaysOnTopCheckbox.addEventListener('change', (e) => {
    window.electronAPI.setAlwaysOnTop(e.target.checked);
});

setColorBtn.addEventListener('click', () => {
    window.electronAPI.setBackgroundColor(backgroundColorInput.value);
});

reloadBtn.addEventListener('click', () => {
    window.electronAPI.reloadWindow();
});