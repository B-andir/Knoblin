const {app, BrowserWindow, net, ipcMain } = require('electron');
const path = require('path');
const settings = require('electron-settings');
const { setupIPCs } = require('./utility/ipcHandler');

const savedBounds = settings.hasSync('windowBounds')
    ? settings.getSync('windowBounds')
    : { width: 800, height: 600 };

function createWindow() {
    const mainWindow = new BrowserWindow({
        x: savedBounds.x,
        y: savedBounds.y,
        width: savedBounds.width,
        height: savedBounds.height,
        minWidth: 800,
        minHeight: 500,
        frame: false,  // Removes all built-in menu options, including close and minimize
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, './utility/preload.js'),
        },
    });

    mainWindow.loadFile(path.join(__dirname, 'main.html'));

    mainWindow.on('close', () => {
        settings.setSync('windowBounds', mainWindow.getBounds());
    });

    setupIPCs(mainWindow);
}

app.whenReady().then(() => {
    createWindow();
})

app.on('window-all-closed', () => {
    // Follow standard Mac behavior, of requiring an explicit "quit" action to terminate.
    if (process.platform !== 'darwin') app.quit(); 
});