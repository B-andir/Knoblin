const { contextBridge, ipcRenderer, Menu } = require('electron');

contextBridge.exposeInMainWorld('api', {
    controlWindow: (command) => ipcRenderer.send('window-control', command),

    togglePin: async() => await ipcRenderer.invoke('toggle-pin'),

    onBackendEvent: (channel, callback) => ipcRenderer.on(channel, (_event, ...args) => callback(...args)),

    // ----< Playlists Navigation >----

    onPlaylistsLoaded: (callback) => ipcRenderer.on('playlists-loaded', (event, data) => callback(data)),

    onPlaylistsUpdated: (callback) => ipcRenderer.on('playlists-updated', (event, data) => callback(data)),

    onPlaylistsFetchResponse: (callback) => ipcRenderer.on('loaded-playlists', (event, data) => callback(data)),

    fetchPlaylists: () => ipcRenderer.send('fetch-playlists'),

    createNewPlaylist: (name) => ipcRenderer.send('create-new-playlist', name),

    renamePlaylist: (id, newName) => ipcRenderer.send('rename-playlst', { id, newName }),

    deletePlaylist: (id) => ipcRenderer.send('delete-playlist', id),

    duplicatePlaylist: (id, name) => ipcRenderer.send('duplicate-playlist', { id, name }),

    savePlaylistsOrder: (newOrder) => ipcRenderer.send('reorder-playlists', newOrder),

    getPlaylistColors: () => {
        return ipcRenderer.invoke('get-playlist-colors')
    },

    getPlaylist: (id) => {
        return ipcRenderer.invoke('get-playlist', id)
    },

    newPlaylistColor: (colorHex) => ipcRenderer.send('new-playlist-color', colorHex),

    removePlaylistColor: (colorHex) => ipcRenderer.send('remove-playlist-color', colorHex),

    setPlaylistColor: (id, newColor) => ipcRenderer.send('set-playlist-color', { id, newColor }),

    setPlaylistSettings: (id, changedSettings) => {
        return ipcRenderer.invoke('set-playlist-settings', {id, changedSettings})
    },

    // ----< Playlist Actions >----

    addSongToPlaylist: async (songUrl, playlistId) => {
        return ipcRenderer.invoke('add-song-to-playlist', {songUrl, playlistId});
    },

    removeSongFromPlaylist: async (songIndex, playlistId) => {
        return ipcRenderer.invoke('remove-song-from-playlist', {songIndex, playlistId});
    },

    updateSongInPlaylist: async (songIndex, newData, playlistId) => {
        return ipcRenderer.invoke('update-song-in-playlist', {songIndex, newData, playlistId});
    },

    playSong: async (songIndex, playlistId) => {
        return ipcRenderer.invoke('play-song-from-playlist', {songIndex, playlistId});
    },
    
    Menu,
});