const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    controlWindow: (command) => ipcRenderer.send('window-control', command),

    togglePin: async() => await ipcRenderer.invoke('toggle-pin'),

    playSong: (url) => ipcRenderer.send('play-song', url),

    onBackendEvent: (channel, callback) => ipcRenderer.on(channel, (_event, ...args) => callback(...args))
});