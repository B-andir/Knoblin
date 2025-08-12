// === Class Definition ===
(() => {
    class PlaylistModule {
        #listeners = [];
        #data;
        #prescrollAnimId;
        #scrolAnimId;
        #postscrollAnimId;
        #currentlySelectedCard;

        constructor(data) {
            this.#data = data;
            this.#prescrollAnimId = null;
            this.#scrolAnimId = null;
            this.#postscrollAnimId = null;
            this.#currentlySelectedCard = null;
            this.init()
        }

        init() {
            console.log("Load Playlist module");
            
            const submitUrlButton = document.getElementById('submit-url-button');
            const pasteClipboardButton = document.getElementById('paste-clipboard-button');
            const urlInputField = document.getElementById('url-input');

            if (submitUrlButton) this.#on(submitUrlButton, 'click', this.handleUrlSubmit.bind(this));
            else console.error('submit-url-button not found');

            if (pasteClipboardButton) this.#on(pasteClipboardButton, 'click', this.handlePasteClipboard.bind(this));
            else console.error('paste-clipboard-button not found');

            if (urlInputField) this.#on(urlInputField, 'keydown', this.handleEnterKey.bind(this))
            else console.error('url-input not found');

            this.BuildPlaylistContent();

            console.log("Playlist Module has been loaded");
        }
        
        #on(target, event, handler, opts) {
            target.addEventListener(event, handler, opts);
            this.#listeners.push({ target, event, handler, opts });
        }

        #off(target, event, handler, opts) {
            target.removeEventListener(event, handler, opts);
        }

        cleanup() {
            console.log("Cleanup Playlist module");

            // Remove event listners
            for (let { target, event, handler, opts } of this.#listeners) {
                target.removeEventListener(event, handler, opts);
            }

            // Clear Timeouts
            clearTimeout(this.#prescrollAnimId);
            clearTimeout(this.#scrolAnimId);
            clearTimeout(this.#postscrollAnimId);

            // Cleanup global variables
            this.#listeners = [];
            this.#data = null;
            this.#prescrollAnimId = null;
            this.#scrolAnimId = null;
            this.#postscrollAnimId = null;
            this.#currentlySelectedCard = null;

            console.log('Playlist module has been cleaned up.')
        }

        async handleUrlSubmit() {
            const inputField = document.getElementById('url-input');
            const newPlaylist = await window.api.addSongToPlaylist(inputField.value, this.#data.id);
            this.#data = newPlaylist;
            this.BuildPlaylistContent();
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

        async BuildPlaylistContent(reset = true) {
            const contentContainer = document.getElementById('playlist-content');
            if (reset) contentContainer.innerHTML = "";

            const playlist = this.#data.playlist;

            if (playlist) {
                for (let index = 0; index < playlist.length; index++) {
                    const element = playlist[index];
                    
                    let songId = "song-"
                    if (index <= 9) 
                        songId += "0" + index;
                    else 
                        songId += index;

                    const newSongCard = document.createElement('div');
                    newSongCard.classList.add('song-card');
                    newSongCard.id = songId;
                    const songCardString = `
                        <div class="song-selection-region">
                            <div class="song-index">
                                <div class="song-actual-index">${index + 1}</div>
                                <div class="song-playhead" title="Play Song">
                                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                                        <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                                        <g id="SVGRepo_iconCarrier"> 
                                            <path fill="currentColor" d="M15 12.3301L9 16.6603L9 8L15 12.3301Z" fill="#000000"></path>
                                        </g>
                                    </svg>
                                </div>
                            </div>
                            <div class="song-title">
                                <span class="text-fade-content">
                                    ${element.title}
                                </span>
                            </div>
                        </div>
                        <div class="song-settings-region">
                            <div class="song-actions">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 16">
                                    <g id="Layer_2" data-name="Layer 2">
                                        <g id="Layer_1-2" data-name="Layer 1">
                                            <path fill="currentColor" d="M1,9A1,1,0,1,1,2,8,1,1,0,0,1,1,9ZM2,1A1,1,0,1,0,1,2,1,1,0,0,0,2,1ZM2,15a1,1,0,1,0-1,1A1,1,0,0,0,2,15Z"/>
                                        </g>
                                    </g>
                                </svg>
                            </div>
                        </div>
                    `;

                    newSongCard.dataset.index = index;
                    newSongCard.innerHTML = songCardString;

                    contentContainer.appendChild(newSongCard);

                    const titleContainer = newSongCard.querySelector('.song-title');
                    const titleContent = titleContainer.querySelector('.text-fade-content');

                    // Scroll title on hover
                    this.#on(newSongCard, 'mouseenter', e => {
                        newSongCard.querySelector('.song-playhead').style.visibility = 'visible';
                        newSongCard.querySelector('.song-actual-index').style.visibility = 'hidden';
                        const containerWidth = titleContainer.offsetWidth;
                        const contentWidth = titleContainer.scrollWidth;

                        if (contentWidth <= containerWidth) return;


                        let distance = contentWidth - containerWidth + 40;
                        let duration = distance * 16;  // Adjust scroll speed

                        this.#prescrollAnimId = setTimeout(() => {
                            titleContent.style.transition = `transform ${duration}ms linear`;
                            titleContent.style.transform = `translateX(-${distance}px)`;
                        }, 500);

                        this.#scrolAnimId = setTimeout(() => {
                            titleContent.style.transform = 'translateX(0)';
                            void titleContent.offsetWidth;

                            this.#postscrollAnimId = setTimeout(() => {
                                newSongCard.dispatchEvent(new Event('mouseenter'));
                            }, 2500)
                        }, duration + 1500);
                    });

                    // Stop title scroll on mouse leave
                    this.#on(newSongCard, 'mouseleave', () => {
                        clearInterval(this.#prescrollAnimId);
                        clearTimeout(this.#scrolAnimId);
                        clearTimeout(this.#postscrollAnimId);
                        this.#prescrollAnimId = null;
                        this.#scrolAnimId = null;
                        this.#postscrollAnimId = null;

                        titleContent.style.transition = 'none';
                        titleContent.style.transform = 'translateX(0)'

                        newSongCard.querySelector('.song-actual-index').style.visibility = 'visible';
                        newSongCard.querySelector('.song-playhead').style.visibility = 'hidden';
                    });

                    // --- Song card interactions ---

                    // Song Selection
                    const songSelection = newSongCard.querySelector('.song-selection-region');
                    this.#on(songSelection, 'click', e => {
                        const OnClickAnywhere = _e => {
                            const targetElement = _e.target.closest('.song-card');

                            if (!targetElement) {
                                // Clicked outside a song card element
                                if (this.#currentlySelectedCard)
                                    this.#currentlySelectedCard.classList.remove('selected');
                                this.#currentlySelectedCard = null;
                            }

                            this.#off(document, 'mousedown', OnClickAnywhere);
                        }
                        this.#off(document, 'mousedown', OnClickAnywhere);

                        const el = e.target.closest('.song-card');
                        if (!el) {
                            if (this.#currentlySelectedCard) {
                                this.#currentlySelectedCard.classList.remove('selected');
                                this.#currentlySelectedCard = null;
                            }
                            return;
                        }

                        const StartPlayingSong = () => {
                            window.api.playSong(el.dataset.index, this.#data.id);
                        }
                        
                        if (el == this.#currentlySelectedCard) {
                            console.log("Event: Should start playing song");
                            StartPlayingSong();
                        } else if (e.target.closest('.song-index')) {
                            console.log("Playhead clicked!");
                            StartPlayingSong();
                        } else {
                            if (this.#currentlySelectedCard)
                                this.#currentlySelectedCard.classList.remove('selected');
                            el.classList.add('selected');
                            this.#currentlySelectedCard = el;
                        }

                        this.#on(document, 'mousedown', OnClickAnywhere);
                    });

                    // Song Actions
                    const songActions = newSongCard.querySelector('.song-actions');
                    this.#on(songActions, 'click', e => {
                        const el = e.target.closest('.song-actions');
                        if (!el) return;
        
                        //compute the popup position off of el...
                        const r = el.getBoundingClientRect();
                        const x = window.innerWidth - r.right + r.width;
                        const y = r.top + window.pageYOffset;
            
                        const popup = createFloatingPopup(x, y, newSongCard, { 'shouldBeOnLeft': true});

                        popup.container.classList.add('song-actions-popup');
        
                        popup.container.innerHTML = `
                            <div class="button textIcon" id="song-actions-rename-button">
                                <div class="icon">
                                    <svg id="edit-2-16px" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                                        <path fill="currentColor" id="Path_120" data-name="Path 120" d="M-10.5,16h-11A2.5,2.5,0,0,1-24,13.5V2.5A2.5,2.5,0,0,1-21.5,0h4a.5.5,0,0,1,.5.5.5.5,0,0,1-.5.5h-4A1.5,1.5,0,0,0-23,2.5v11A1.5,1.5,0,0,0-21.5,15h11A1.5,1.5,0,0,0-9,13.5v-4A.5.5,0,0,1-8.5,9a.5.5,0,0,1,.5.5v4A2.5,2.5,0,0,1-10.5,16Zm-5.646-4.146,8-8a.5.5,0,0,0,0-.708l-3-3a.5.5,0,0,0-.708,0l-8,8A.5.5,0,0,0-20,8.5v3a.5.5,0,0,0,.5.5h3A.5.5,0,0,0-16.146,11.854ZM-19,8.707l7.5-7.5L-9.207,3.5l-7.5,7.5H-19Z" transform="translate(24 0)"/>
                                    </svg>
                                </div>
                                <div class="text">
                                    Rename
                                </div>
                            </div>
                            <div class="button textIcon" id="song-actions-delete-button">
                                <div class="icon">
                                    <svg id="trash-16px" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                                        <path fill="currentColor" id="Path_23" data-name="Path 23" d="M-250.5-236H-255v-1.5a1.5,1.5,0,0,0-1.5-1.5h-3a1.5,1.5,0,0,0-1.5,1.5v1.5h-4.5a.5.5,0,0,0-.5.5.5.5,0,0,0,.5.5h1.5v10.5a1.5,1.5,0,0,0,1.5,1.5h9a1.5,1.5,0,0,0,1.5-1.5V-235h1.5a.5.5,0,0,0,.5-.5A.5.5,0,0,0-250.5-236Zm-9.5-1.5a.5.5,0,0,1,.5-.5h3a.5.5,0,0,1,.5.5v1.5h-4Zm7,13a.5.5,0,0,1-.5.5h-9a.5.5,0,0,1-.5-.5V-235h10Zm-7-9v8a.5.5,0,0,1-.5.5.5.5,0,0,1-.5-.5v-8a.5.5,0,0,1,.5-.5A.5.5,0,0,1-260-233.5Zm4.5-.5a.5.5,0,0,1,.5.5v8a.5.5,0,0,1-.5.5.5.5,0,0,1-.5-.5v-8A.5.5,0,0,1-255.5-234Zm-2,.5v8a.5.5,0,0,1-.5.5.5.5,0,0,1-.5-.5v-8a.5.5,0,0,1,.5-.5A.5.5,0,0,1-257.5-233.5Z" transform="translate(266 239)"/>
                                    </svg>
                                </div>
                                <div class="text">
                                    Delete
                                </div>
                            </div>
                        `;
        
                        const renameBtn = popup.container.querySelector('#song-actions-rename-button');
                        const deleteBtn = popup.container.querySelector('#song-actions-delete-button');
        
                        // Rename Button
                        popup.on(renameBtn, 'click', _e => {

                            let popupXPos = _e.pageX;
                            const popupWidth = 220;
                            if (popupXPos + popupWidth >= window.innerWidth) {
                                popupXPos -= popupWidth;
                            }

                            let textContent = this.#data.playlist[popup.anchor.dataset.index].title;

                            showFloatingInput(popupXPos, _e.pageY, textContent, async value => {
                                popup.destroy();
                                const newText = value.trim();

                                if (newText != textContent) {
                                    const newPlaylist = await window.api.updateSongInPlaylist(popup.anchor.dataset.index, { title: newText }, this.#data.id);
    
                                    if (newPlaylist) {
                                        switchContentModuleAsync('playlist', newPlaylist)
                                    }
                                }
                            });
                        });

                        // Delete button
                        popup.on(deleteBtn, 'click', _e => {
                            if (document.querySelector('.confirmDeleteMenu')) return;
                            const songEl = e.target.closest('.song-card');
                            if (!songEl) return;

                            let popupXPos = _e.pageX;
                            const popupWidth = 65;
                            if (popupXPos + popupWidth + 10 >= window.innerWidth) {
                                popupXPos -= popupWidth + 10;
                            }

                            const menu = createFloatingPopup(popupXPos, _e.pageY, deleteBtn, { destroyOnNew: false });
                            menu.container.style.width = `${popupWidth}px`;
                            menu.container.classList.add('confirmDeleteMenu');
                            menu.container.innerHTML = `<div id="confirmDeleteButton">Delete?</div>`
            
                            const confirmDeleteButton = document.querySelector('#confirmDeleteButton');
                            menu.on(confirmDeleteButton, 'click', async e => {
                                const newPlaylist = await window.api.removeSongFromPlaylist(popup.anchor.dataset.index, this.#data.id);
                                menu.destroy();
                                popup.destroy();

                                if (newPlaylist) {
                                    switchContentModuleAsync('playlist', newPlaylist)
                                }
                            });
                        });
                    });
                }
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