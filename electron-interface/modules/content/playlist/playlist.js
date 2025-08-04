// === Class Definition ===
(() => {
    class PlaylistModule {
        #listeners = [];
        #data;

        constructor(data) {
            this.#data = data;
            this.init()
        }

        init() {
            console.log("Load Playlist module");
            
            console.log("Playlist data: ", this.#data);
            
            const submitUrlButton = document.getElementById('submit-url-button');
            const pasteClipboardButton = document.getElementById('paste-clipboard-button');
            const urlInputField = document.getElementById('url-input');

            if (submitUrlButton) this.#on(submitUrlButton, 'click', this.handleUrlSubmit.bind(this));
            else console.error('submit-url-button not found');

            if (pasteClipboardButton) this.#on(pasteClipboardButton, 'click', this.handlePasteClipboard.bind(this));
            else console.error('paste-clipboard-button not found');

            if (urlInputField) this.#on(urlInputField, 'keydown', this.handleEnterKey.bind(this))
            else console.error('url-input not found');
        }
        
        #on(target, event, handler, opts) {
            target.addEventListener(event, handler, opts);
            this.#listeners.push({ target, event, handler, opts });
        }

        cleanup() {
            console.log("Cleanup Playlist module");

            // Remove event listners
            for (let { target, event, handler, opts } of this.#listeners) {
                target.removeEventListener(event, handler, opts);
            }

            // Cleanup global variables
            this.#listeners = [];
            this.#data = null;

            console.log('Playlist module has been cleaned up.')
        }

        async handleUrlSubmit() {
            const inputField = document.getElementById('url-input');
            // window.api.playSong(inputField.value);
            window.api.addSongToPlaylist(inputField.value, this.#data.id);
        }

        async handlePasteClipboard() {
            try {
                const text = await navigator.clipboard.readText();
                document.getElementById('url-input').value = text;
            } catch (err) {
                console.error('Failed to read clipboard: ', err);
            }
        }

        async handleEnterKey(event) {
            if (event.key === "Enter") {
                event.preventDefault();
                console.log("Enter pressed! Submit url");
                handleUrlSubmit();
            }
        }
    }

    // === Global Interface ===
    let instance = null;

    // Init
    window.initContentPlaylist = function initPlaylist(data) {
        console.log("Try load Playlist Module");
        instance = new PlaylistModule(data);
    };

    // Cleanup
    window.currentContentModuleCleanup = function cleanupPlaylistModule() {
        console.log("Try cleanup Playlist Module");
        if (instance) {
            instance.cleanup();
            instance = null;
        }
    }
})();