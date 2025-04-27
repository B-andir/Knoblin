const { app, ipcMain } = require('electron')
const playlistManager = require('./playlists/playlistManager');
const ytdl = require('@distube/ytdl-core');
const events = require('event-client-lib');

module.exports = { setupIPCs: (window) => {

    console.log("Setting up IPCs ...")

    events.connectToEventServer('Electron');

    // ----<  Menu Buttons  >----
    ipcMain.on('window-control', (event, command) => {
        if (!window) return;
          switch (command) {
                case 'close':
                    app.quit();
                    break;

                case 'minimize':
                    window.minimize();
                    break;

                default:
                    break;
        }
    });

    ipcMain.on('play-song', async (event, url) => {
        if (!ytdl.validateURL(url)) {
            throw new Error('Invalid YouTube URL: ', url);
        }

        const info = await ytdl.getInfo(url);
        const song = {
            title: info.videoDetails.title,
            url: url,
        };

        events.emit('playSong', { song, GUILD_ID: process.env.GUILD_ID });
    });

    ipcMain.handle('toggle-pin', (event) => {
        if (!window) return false;

        // Toggle the always-on-top state
        const newState = !window.isAlwaysOnTop();
        window.setAlwaysOnTop(newState);

        return newState
    });

    // ----< Playlists Navigation >----

    // This would require sanitisation if it were a public project.
    ipcMain.on('create-new-playlist', async (event, name) => {
        name = name.length == 0 ? "New Playlist" : name
        playlistManager.createPlaylist(name);
    });

    ipcMain.on('remove-playlist', async (event, id) => {
        playlistManager.removePlaylist(id);
    })

    // ----<  Control Bar  >----
    
    // ~~ Events ~~
    events.on('new-volume-main', (data) => {
        const newVolume = data.newVolume;

        window.webContents.send('new-volume-main', { newVolume });
    });

    console.log("IPCs ready!\n")
    
} }