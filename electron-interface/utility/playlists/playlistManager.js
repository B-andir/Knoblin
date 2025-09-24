const { app, BrowserWindow } = require('electron');
const Playlist = require('./playlistClass');
const Song = require('./songClass');
const path = require('path');
const fs = require('fs').promises;

const dataFilePath = path.join(app.getPath('userData'), 'playlist-data.json');

const DEFAULT_DATA = []
let playlists = DEFAULT_DATA;

async function loadPlaylistsData() {
    try {
        const contents = await fs.readFile(dataFilePath, 'utf-8');
        playlists = JSON.parse(contents);
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
        win.webContents.send('playlists-updated', { playlists });
    });
}
async function savePlaylistsData(sendEvent = true) {
    try {
        await fs.mkdir(path.dirname(dataFilePath), { recursive: true });
        await fs.writeFile(dataFilePath, JSON.stringify(playlists, null, 2), 'utf-8');
        if (sendEvent) updateFrontend();
    } catch (err) {
        console.error('Failed to save data:', err);
    }
}

function createPlaylist(name) {
    let newPlaylist = new Playlist(name);
    playlists.push(newPlaylist);
    savePlaylistsData();
}

function createPlaylistFromObject(playlistObj, name = null) {
    let newPlaylist = new Playlist(name || playlistObj.name, playlistObj.color || null, playlistObj.layer, playlistObj.type, playlistObj.playlist);
    playlists.push(newPlaylist);
    savePlaylistsData();
}

function updatePlaylist(id, args) {
    const index = playlists.findIndex(item => item.id === id);
    if (index !== -1) {
        playlists[index] = {
        ...playlists[index],  // keep all existing fields (id, etc.)
        ...args               // overwrite only the ones provided
        };
        savePlaylistsData();
        return playlists[index];
    }
    return null;
}

function deletePlaylist(id) {
    const index = playlists.findIndex(item => item.id === id);
    if (index !== -1) {
        playlists.splice(index, 1);
        savePlaylistsData();
    }
}

function duplicatePlaylist(id, name) {
    const index = playlists.findIndex(item => item.id === id);
    if (index !== -1) {
        createPlaylistFromObject(playlists[index], name);
    }
}

function cleanupPlaylists() {
    for(let i = playlists.length - 1; i >= 0; i--) {
        if (playlists[i].id == undefined) {
            playlists.splice(i, 1);
        }
    }
    savePlaylistsData();
}

/**
 * Reorder playlists based on an array of playlist IDs.
 * @param {string[]} newOrder - Array of playlist IDs in the desired order.
 */
async function reorderPlaylists(newOrder) {
    const idToPlaylist = new Map(playlists.map(pl => [pl.id, pl]));
    // Build reordered list, filtering out any unknown IDs
    playlists = newOrder
        .map(id => idToPlaylist.get(id))
        .filter(pl => pl !== undefined);

    savePlaylistsData();
}

function getPlaylists() {
    return playlists;
}

function getPlaylist(id) {
    const index = playlists.findIndex(item => item.id === id);
    if (index !== -1) return playlists[index];
    else return null;
}

function addSongToPlaylist(songObj, playlistId) {
    const playlist = getPlaylist(playlistId);
    if (playlist) {
        const newSong = new Song(songObj.title, songObj.url);
        playlist.playlist.push(newSong);
        console.log(`Added track "${newSong.title}" to playlist "${playlist.name}"`);
        savePlaylistsData(false);
        return playlist;
    } else return null;
}

function removeSongFromPlaylist(songIndex, playlistId) {
    const playlist = getPlaylist(playlistId);
    if (playlist) {
        if (songIndex < 0 || songIndex >= playlist.playlist.length) return null;
        const removed = playlist.playlist.splice(songIndex, 1)[0];
        console.log(`Removed track "${removed.title}" from playlist "${playlist.name}"`);
        savePlaylistsData(false);
        return playlist;
    } else return null;
}

function updateSongInPlaylist(songIndex, options, playlistId) {
    const playlist = getPlaylist(playlistId);
    if (playlist) {
        if (songIndex < 0 || songIndex >= playlist.playlist.length) return null;
        playlist.playlist[songIndex] = { ...options }
        savePlaylistsData(false);
        return playlist;
    } else return null;
}

function getSongByIndex(songIndex, playlistId) {
    const playlist = getPlaylist(playlistId);
    if (playlist) {
        if (songIndex < 0 || songIndex >= playlist.playlist.length) return null;
        const song = playlist.playlist[songIndex] || null;
        
        if (!song.id) {
            const newSong = new Song(song.title, song.url);
            playlist.playlist[songIndex] = newSong;
            return newSong;
        }

        return song;
    } else return null;
}

function getSongById(songId, playlistId) {
    const playlist = getPlaylist(playlistId);
    if (playlist) {
        const index = playlist.playlist.findIndex(item => item.id === id);
        const song = playlist.playlist[index] || null;
        return song;
    } else return null;
}

module.exports = { 
    createPlaylist, 
    duplicatePlaylist, 
    updatePlaylist, 
    deletePlaylist, 
    loadPlaylistsData, 
    cleanupPlaylists,
    reorderPlaylists,
    getPlaylists, 
    getPlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    updateSongInPlaylist,
    getSongByIndex,
    getSongById,
}