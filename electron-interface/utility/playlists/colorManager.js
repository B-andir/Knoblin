const { app } = require('electron');
const path = require('path');
const fs = require('fs').promises;

const dataFilePath = path.join(app.getPath('userData'), 'color-data.json');

const DEFAULT_DATA = []
let colorOptions = DEFAULT_DATA;

async function loadColorData() {
    try {
        const contents = await fs.readFile(dataFilePath, 'utf-8');
        colorOptions = JSON.parse(contents);
    } catch (err) {
        if (err.code === 'ENOENT') {
            // File doesn't exist yet; initialize with defaults
            colorOptions = DEFAULT_DATA;
            console.log('No existing data, using default');
        } else {
            console.error('Failed to load data:', err);
        }
    }
}

async function saveColorsData() {
    try {
        await fs.mkdir(path.dirname(dataFilePath), { recursive: true });
        await fs.writeFile(dataFilePath, JSON.stringify(colorOptions, null, 2), 'utf-8');
        updateFrontend();
    } catch (err) {
        console.error('Failed to save data:', err);
    }
}

function newColor(newColor) {
    colorOptions.push(newColor);
    saveColorsData();
}

function deleteColor(colorHex) {
    const index = colorOptions.findIndex(item => item === colorHex);
    if (index !== -1) {
        colorOptions.splice(index, 1);
        saveColorsData();
    }
}

function getColors() {
    return colorOptions;
}

module.exports = { newColor, deleteColor, getColors, loadColorData }