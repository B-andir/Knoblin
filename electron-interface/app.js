const {app, BrowserWindow, screen } = require('electron');
const path = require('path');
const settings = require('electron-settings');
const { setupIPCs } = require('./utility/ipcHandler');
const playlistManager = require('./utility/playlists/playlistManager');

function createWindow() {
    // Retrieve the saved window bounds
    const savedBounds = settings.getSync('windowBounds') || { x: undefined, y: undefined, width: 1000, height: 600 };
    
    let adjustedWidth = savedBounds.width;
    let adjustedHeight = savedBounds.height;

    // Rescale the window to fit display's scale factor as compared to primary monitor
    if (savedBounds.scaleFactor) {
        const factor = screen.getPrimaryDisplay().scaleFactor / savedBounds.scaleFactor;
        adjustedWidth = Math.round(savedBounds.width * factor);
        adjustedHeight = Math.round(savedBounds.height * factor);
    }

    const mainWindow = new BrowserWindow({
        x: savedBounds.x,
        y: savedBounds.y,
        width: adjustedWidth,
        height: adjustedHeight,
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

    mainWindow.webContents.once('did-finish-load', () => {
        let playlists = playlistManager.getPlaylists();
        mainWindow.webContents.send('playlists-loaded', { playlists })
    });

    mainWindow.on('close', () => {
        const bounds = mainWindow.getBounds();
        const display = screen.getDisplayMatching(bounds);
        settings.setSync('windowBounds', {
            ...bounds,
            scaleFactor: display.scaleFactor,
        });
    });

    setupIPCs(mainWindow);
}

app.whenReady().then(async () => {
    await playlistManager.loadPlaylistsData();
    createWindow();
})

app.on('window-all-closed', () => {
    // Follow standard Mac behavior, of requiring an explicit "quit" action to terminate.
    if (process.platform !== 'darwin') app.quit(); 
});