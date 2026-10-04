const { app, ipcMain, BrowserWindow } = require('electron')
const playlistManager = require('./playlists/playlistManager');
const colorManager = require('./playlists/colorManager');
const { randomUUID } = require('crypto');
const ytdl = require('@distube/ytdl-core');
const events = require('event-client-lib');

const pendingDownloads = new Map();

function requestDownload(eventName, payload, timeoutMs = 30 * 60 * 1000) {
    const requestId = randomUUID();
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            pendingDownloads.delete(requestId);
            resolve({ success: false, error: 'Timed out waiting for the bot' });
        }, timeoutMs);

        pendingDownloads.set(requestId, (result) => {
            clearTimeout(timer);
            resolve(result);
        })

        events.emit(eventName, { ...payload, requestId });
    })
}

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

    // DEPRECATED
    //-
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
    //-

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

    ipcMain.on('rename-playlst', async (event, data) => {
        console.log(`Recieved IPC call to rename a playlist.\nPaylist ID: ${data.id}\nNew Name: ${data.newName}`)
        playlistManager.updatePlaylist(data.id, { name: data.newName});
    });

    ipcMain.on('duplicate-playlist', async (event, data) => {
        playlistManager.duplicatePlaylist(data.id, data.name);
    });

    ipcMain.on('delete-playlist', async (event, id) => {
        playlistManager.deletePlaylist(id);
    });

    ipcMain.on('fetch-playlists', async (event) => {
        let playlists = playlistManager.getPlaylists();
        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('loaded-playlists', { playlists });
        });
    });

    ipcMain.handle('get-playlist', async (event, id) => {
        let playlist = playlistManager.getPlaylist(id);
        if (playlist) {
            console.log(playlist);
            return playlist;
        }
    });

    ipcMain.on('reorder-playlists', async (event, newOrder) => {
        playlistManager.reorderPlaylists(newOrder);
    })

    ipcMain.handle('get-playlist-colors', async (event) => {
        return colorManager.getColors();
    });

    ipcMain.on('new-playlist-color', async (event, colorHex) => {
        console.log(`Save new colors: ${colorHex}`);
        colorManager.newColor(colorHex);
    });

    ipcMain.on('remove-playlist-color', async (event, colorHex) => {
        colorManager.deleteColor(colorHex);
    });

    ipcMain.on('set-playlist-color', async (event, data) => {
        playlistManager.updatePlaylist(data.id, { color: data.newColor });
    });

    ipcMain.handle('set-playlist-settings', async (event, data) => {
        return playlistManager.updatePlaylist(data.id, data.changedSettings);
    });

    // ----< Playlist Actions >----
    
    ipcMain.handle('add-song-to-playlist', async (event, data) => {
        const url = data.songUrl;
        if (!ytdl.validateURL(url)) {
            throw new Error('Invalid YouTube URL: ', url);
        }

        const info = await ytdl.getInfo(url);
        const song = {
            title: info.videoDetails.title,
            url: url,
        };
        
        return playlistManager.addSongToPlaylist(song, data.playlistId);
    });

    ipcMain.handle('remove-song-from-playlist', async (event, data) => {
        return playlistManager.removeSongFromPlaylist(data.songIndex, data.playlistId);
    });

    ipcMain.handle('update-song-in-playlist', async (event, data) => {
        return playlistManager.updateSongInPlaylist(data.songIndex, data.newData, data.playlistId);
    });

    ipcMain.handle('play-song-from-playlist', async (event, data) => {
        const song = await playlistManager.getSongByIndex(data.songIndex, data.playlistId);

        events.emit('playSong', { song, GUILD_ID: process.env.GUILD_ID });
    });

    ipcMain.handle('download-song-from-playlist', async (event, data) => {
        const song = await playlistManager.getSongByIndex(data.songIndex, data.playlistId);
        return (requestDownload('downloadSong', { song }));
    });

    ipcMain.handle('download-song', async (event, data) => {
        return (requestDownload('downloadSong', { song: { url: data.songUrl } }));
    });

    ipcMain.handle('download-playlist', async (event, data) => {
        return (requestDownload('downloadPlaylist', { url: data.url }));
    });

    

    ipcMain.on('ytdlp-update-request', (event, opts) => {
        events.emit('ytdlp-update-request', { force: !!opts?.force });
    });

    ipcMain.on('ytdlp-status-request', () => events.emit('ytdlp-status-request'));

    events.on('ytdlp-update-status', (data) => {
        window.webContents.send('ytdlp-update-status', data);
    })

    events.on('downloadFinished', (data) => {
        const done = pendingDownloads.get(data.requestId);
        if (!done) return;
        pendingDownloads.delete(data.requestId);
        done(data);
    })
    

    // ----<  Control Bar  >----
    
    // ~~ Events ~~
    events.on('new-volume-main', (data) => {
        const newVolume = data.newVolume;

        window.webContents.send('new-volume-main', { newVolume });
    });

    console.log("IPCs ready!\n")
    
} }