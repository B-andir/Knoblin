const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    controlWindow: (command) => ipcRenderer.send('window-control', command),

    togglePin: async() => await ipcRenderer.invoke('toggle-pin'),

    playSong: (url) => ipcRenderer.send('play-song', url),

    onBackendEvent: (channel, callback) => ipcRenderer.on(channel, (_event, ...args) => callback(...args)),

    // Playlists
    onPlaylistsLoaded: (callback) => ipcRenderer.on('playlists-loaded', (event, data) => callback(data)),

    onPlaylistsUpdated: (callback) => ipcRenderer.on('playlists-updated', (event, data) => callback(data)),

    onPlaylistsFetchResponse: (callback) => ipcRenderer.on('loaded-playlists', (event, data) => callback(data)),

    fetchPlaylists: () => ipcRenderer.send('fetch-playlists'),

    createNewPlaylist: (name) => ipcRenderer.send('create-new-playlist', name),

    renamePlaylist: (id, newName) => ipcRenderer.send('rename-playlst', { id, newName }),

    deletePlaylist: (id) => ipcRenderer.send('delete-playlist', id),
});