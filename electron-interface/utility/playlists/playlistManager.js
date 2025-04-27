const { app, BrowserWindow } = require('electron');
const Playlist = require('./playlistClass');
const path = require('path');
const fs = require('fs').promises;

const dataFilePath = path.join(app.getPath('userData'), 'playlist-data.json');

const DEFAULT_DATA = []
let playlists = DEFAULT_DATA;

async function loadPlaylistsData() {
    try {
        const contents = await fs.readFile(dataFilePath, 'utf-8');
        playlists = JSON.parse(contents);
        console.log('Data loaded:', data);
    } catch (err) {
        if (err.code === 'ENOENT') {
            // File doesn't exist yet; initialize with defaults
            playlists = DEFAULT_DATA;
            console.log('No existing data, using default');
        } else {
            console.error('Failed to load data:', err);
        }
    }
}

// Not exposed to module, as we never want to visually show changes without saving them.
// Hence, this function is only ever called if data has been saved.
async function updateFrontend() {
    // Broadcast new playlists to all renderer windows
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('playlists-updated', playlists);
    });
}

async function savePlaylistsData() {
    try {
        await fs.mkdir(path.dirname(dataFilePath), { recursive: true });
        await fs.writeFile(dataFilePath, JSON.stringify(playlists, null, 2), 'utf-8');
        updateFrontend();
    } catch (err) {
        console.error('Failed to save data:', err);
    }
}

function createPlaylist(name) {
    let newPlaylist = new Playlist(name);
    playlists.push(newPlaylist);
    savePlaylistsData();
}

function removePlaylist(id) {
    const index = playlists.findIndex(item => item.id === id);
    if (index !== -1) {
        playlists.splice(index, 1);
        savePlaylistsData();
    }
}

function getPlaylists() {
    return playlists;
}

module.exports = { createPlaylist, removePlaylist, getPlaylists, loadPlaylistsData }