function loadThisScript() {
    document.removeEventListener('content-module-loaded', loadThisScript)
    
    const submitUrlButton = document.getElementById('submit-url-button');
    if (submitUrlButton) submitUrlButton.addEventListener('click', handleUrlSubmit);
    else console.error('submit-url-button not found');

    const pasteClipboardButton = document.getElementById('paste-clipboard-button');
    if (pasteClipboardButton) pasteClipboardButton.addEventListener('click', handlePasteClipboard);
    else console.error('paste-clipboard-button not found');
}

function handleUrlSubmit() {
    const inputField = document.getElementById('url-input');
    window.api.playSong(inputField.value);
}

function handlePasteClipboard() {

}

// Check if the module's HTML is already loaded
if (document.getElementById('playlist-module-load-checker')) {
    loadThisScript();
} else {
    // Otherwise, listen for the custom event
    document.addEventListener('content-module-loaded', loadThisScript);
}

// Cleanup
(() => {
    window.currentContentModuleCleanup = function cleanupPlaylistModule() {
        // Remove event listners
        const submitUrlButton = document.getElementById('submit-url-button');
        submitUrlButton.removeEventListener('click', handleUrlSubmit);

        console.log('Playlist module has been cleaned up.')
    }
})();