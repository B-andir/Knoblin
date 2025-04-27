function loadThisScript() {
    document.removeEventListener('module-loaded', loadThisScript)
    
    // const submitUrlButton = document.getElementById('submit-url-button');
    // if (submitUrlButton) submitUrlButton.addEventListener('click', handleUrlSubmit);
    // else console.error('submit-url-button not found');

    // const pasteClipboardButton = document.getElementById('paste-clipboard-button');
    // if (pasteClipboardButton) pasteClipboardButton.addEventListener('click', handlePasteClipboard);
    // else console.error('paste-clipboard-button not found');
}

function handleUrlSubmit() {
    const inputField = document.getElementById('url-input');
    window.api.playSong(inputField.value);
}

function handlePasteClipboard() {

}

window.api.onPlaylistsLoaded(data => {
    console.log('Loaded playlists data from withing the playlist nav: ', data);
});

// Check if the module's HTML is already loaded
if (document.getElementById('submit-url-button')) {
    loadThisScript();
} else {
    // Otherwise, listen for the custom event
    document.addEventListener('module-loaded', loadThisScript);
}

// Cleanup
(() => {
    window.currentNavigationModuleCleanup = function cleanupPlaylistNavModule() {
        // Remove event listners
        // const submitUrlButton = document.getElementById('submit-url-button');
        // submitUrlButton.removeEventListener('click', handleUrlSubmit);

        console.log('PlaylistsNav module has been cleaned up.')
    }
})();