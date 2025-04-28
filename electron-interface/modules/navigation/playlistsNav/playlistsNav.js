const listners = [];

function loadThisScript() {
    document.removeEventListener('navigation-module-loaded', loadThisScript);


    const newPlaylistBtn = document.getElementById('navigation-playlistsNewPlaylists');
    on(newPlaylistBtn, 'click', handleNewPlaylistButtonClicked);
    // const submitUrlButton = document.getElementById('submit-url-button');
    // if (submitUrlButton) submitUrlButton.addEventListener('click', handleUrlSubmit);
    // else console.error('submit-url-button not found');

    // const pasteClipboardButton = document.getElementById('paste-clipboard-button');
    // if (pasteClipboardButton) pasteClipboardButton.addEventListener('click', handlePasteClipboard);
    // else console.error('paste-clipboard-button not found');
}

function on(target, event, handler, opts) {
    target.addEventListener(event, handler, opts);
    listners.push({ target, event, handler, opts });
}

function renderPlaylistsNavigation(playlists) {
    const container = document.getElementById('navigation-playlistsContainer');

    container.innerHTML = '';

    playlists.forEach(playlist => {
        // Create playlist entry, root object
        const entry = document.createElement('div');
        entry.classList.add('playlistEntry');
        entry.id = playlist.id;

        const htmlString = `
            <div class="playlistIcon">
                <div class="circle" style="background-color: ${playlist.color || "#00000000"}"></div>
            </div>
            <div class="playlistName">
                ${playlist.name}
            </div>
            <div class="playlistActions">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 16">
                    <g id="Layer_2" data-name="Layer 2">
                        <g id="Layer_1-2" data-name="Layer 1">
                            <path fill="currentColor" d="M1,9A1,1,0,1,1,2,8,1,1,0,0,1,1,9ZM2,1A1,1,0,1,0,1,2,1,1,0,0,0,2,1ZM2,15a1,1,0,1,0-1,1A1,1,0,0,0,2,15Z"/>
                        </g>
                    </g>
                </svg>
            </div>
        `;

        entry.innerHTML = htmlString;

        // Add to container
        container.appendChild(entry);

        const playlistActions = entry.querySelector('.playlistActions');
        on(playlistActions, 'click', e => {
            const el = e.target.closest('.playlistActions');
            if (!el) return;

            //compute the popup position off of el...
            const r = el.getBoundingClientRect();
            const x = r.right + window.pageXOffset;
            const y = r.top + window.pageYOffset;

            const popup = createFloatingPopup(x, y, entry);

            popup.container.classList.add('playlistActionsPopup');

            popup.container.innerHTML = `
                <div class="button textIcon" id="playlistActionRenameButton">
                    <div class="icon">
                        <svg id="edit-2-16px" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                            <path fill="currentColor" id="Path_120" data-name="Path 120" d="M-10.5,16h-11A2.5,2.5,0,0,1-24,13.5V2.5A2.5,2.5,0,0,1-21.5,0h4a.5.5,0,0,1,.5.5.5.5,0,0,1-.5.5h-4A1.5,1.5,0,0,0-23,2.5v11A1.5,1.5,0,0,0-21.5,15h11A1.5,1.5,0,0,0-9,13.5v-4A.5.5,0,0,1-8.5,9a.5.5,0,0,1,.5.5v4A2.5,2.5,0,0,1-10.5,16Zm-5.646-4.146,8-8a.5.5,0,0,0,0-.708l-3-3a.5.5,0,0,0-.708,0l-8,8A.5.5,0,0,0-20,8.5v3a.5.5,0,0,0,.5.5h3A.5.5,0,0,0-16.146,11.854ZM-19,8.707l7.5-7.5L-9.207,3.5l-7.5,7.5H-19Z" transform="translate(24 0)"/>
                        </svg>
                    </div>
                    <div class="text">
                        Rename
                    </div>
                </div>
                <div class="button textIcon" id="playlistActionDuplicateButton">
                    <div class="icon">
                        <svg id="file-copy-16px" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                            <path fill="currentColor" id="Path_107" data-name="Path 107" d="M37.961,5.308a.5.5,0,0,0-.108-.162l-5-5A.507.507,0,0,0,32.5,0h-4A2.5,2.5,0,0,0,26,2.5V3H24.5A2.5,2.5,0,0,0,22,5.5v8A2.5,2.5,0,0,0,24.5,16h7A2.5,2.5,0,0,0,34,13.5V13h1.5A2.5,2.5,0,0,0,38,10.5v-5A.5.5,0,0,0,37.961,5.308ZM33,1.707,36.293,5H34.5A1.5,1.5,0,0,1,33,3.5ZM33,13.5A1.5,1.5,0,0,1,31.5,15h-7A1.5,1.5,0,0,1,23,13.5v-8A1.5,1.5,0,0,1,24.5,4H26v6.5A2.5,2.5,0,0,0,28.5,13H33ZM35.5,12h-7A1.5,1.5,0,0,1,27,10.5v-8A1.5,1.5,0,0,1,28.5,1H32V3.5A2.5,2.5,0,0,0,34.5,6H37v4.5A1.5,1.5,0,0,1,35.5,12Z" transform="translate(-22)"/>
                        </svg>
                    </div>
                    <div class="text">
                        Duplicate
                    </div>
                </div>
                <div class="button textIcon" id="playlistActionSettingsButton">
                    <div class="icon">
                        <svg id="settings-16px" xmlns="http://www.w3.org/2000/svg" width="15.004" height="16" viewBox="0 0 15.004 16">
                            <path fill="currentColor" id="Path_39" data-name="Path 39" d="M-493.35-320H-494.7a1.865,1.865,0,0,1-1.863-1.862v-.626a.186.186,0,0,0-.091-.159l-.676-.394a.184.184,0,0,0-.183,0l-.539.311a1.845,1.845,0,0,1-1.414.186,1.855,1.855,0,0,1-1.133-.869l-.679-1.18a1.867,1.867,0,0,1,.68-2.541l.548-.316a.186.186,0,0,0,.092-.16v-.78a.186.186,0,0,0-.092-.16l-.547-.316a1.866,1.866,0,0,1-.681-2.541l.679-1.18a1.855,1.855,0,0,1,1.133-.869,1.837,1.837,0,0,1,1.414.187l.538.31a.181.181,0,0,0,.184,0l.676-.394a.186.186,0,0,0,.091-.159v-.626A1.865,1.865,0,0,1-494.7-336h1.353a1.865,1.865,0,0,1,1.864,1.862v.626a.187.187,0,0,0,.09.159l.677.394a.179.179,0,0,0,.183,0l.538-.311a1.841,1.841,0,0,1,1.415-.186,1.85,1.85,0,0,1,1.132.869l.679,1.18a1.866,1.866,0,0,1-.68,2.541l-.548.316a.186.186,0,0,0-.092.16v.78a.186.186,0,0,0,.092.16l.547.316a1.865,1.865,0,0,1,.681,2.541l-.679,1.18a1.85,1.85,0,0,1-1.132.869,1.842,1.842,0,0,1-1.415-.187l-.537-.31a.186.186,0,0,0-.184,0l-.677.394a.187.187,0,0,0-.09.159v.626A1.865,1.865,0,0,1-493.35-320Zm-4.076-4.063a1.185,1.185,0,0,1,.6.161l.676.4a1.181,1.181,0,0,1,.586,1.019v.626a.866.866,0,0,0,.866.865h1.353a.867.867,0,0,0,.867-.865v-.626a1.183,1.183,0,0,1,.585-1.019l.676-.4a1.185,1.185,0,0,1,1.186,0l.537.31a.849.849,0,0,0,.658.087.854.854,0,0,0,.525-.4l.68-1.179a.868.868,0,0,0-.317-1.181l-.546-.317a1.183,1.183,0,0,1-.59-1.022v-.78a1.183,1.183,0,0,1,.59-1.022h0l.547-.317a.868.868,0,0,0,.316-1.181l-.68-1.179a.854.854,0,0,0-.525-.4.871.871,0,0,0-.658.086l-.538.311a1.176,1.176,0,0,1-1.185,0l-.676-.4a1.183,1.183,0,0,1-.585-1.019v-.626a.867.867,0,0,0-.867-.865H-494.7a.866.866,0,0,0-.866.865v.626a1.181,1.181,0,0,1-.586,1.019l-.676.4a1.181,1.181,0,0,1-1.186,0l-.536-.31a.862.862,0,0,0-.658-.087.856.856,0,0,0-.526.4l-.68,1.179a.868.868,0,0,0,.317,1.181l.546.317a1.183,1.183,0,0,1,.59,1.022v.78a1.183,1.183,0,0,1-.59,1.022l-.547.317a.868.868,0,0,0-.316,1.181l.68,1.179a.856.856,0,0,0,.526.4.853.853,0,0,0,.658-.086l.537-.311A1.172,1.172,0,0,1-497.426-324.063Zm3.417-.711A3.23,3.23,0,0,1-497.235-328a3.23,3.23,0,0,1,3.226-3.226A3.23,3.23,0,0,1-490.782-328,3.23,3.23,0,0,1-494.009-324.774Zm0-5.455A2.232,2.232,0,0,0-496.238-328a2.232,2.232,0,0,0,2.229,2.229A2.233,2.233,0,0,0-491.778-328,2.233,2.233,0,0,0-494.009-330.229Z" transform="translate(501.528 336)"/>
                        </svg>
                    </div>
                    <div class="text">
                        Settings
                    </div>
                </div>
                <div class="button textIcon" id="playlistActionDeleteButton">
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

            const renameBtn = popup.container.querySelector('#playlistActionRenameButton');
            const duplicateBtn = popup.container.querySelector('#playlistActionDuplicateButton');
            const settingsBtn = popup.container.querySelector('#playlistActionSettingsButton');
            const deleteBtn = popup.container.querySelector('#playlistActionDeleteButton');

            function onRenameBtnClicked(e) {
                showFloatingInput(e.pageX, e.pageY, playlist.name, value => {
                    window.api.renamePlaylist(popup.anchorId, value);
                    popup.destroy();
                });
            }

            function onDeleteBtnClicked() {
                window.api.deletePlaylist(popup.anchorId);
                popup.destroy();
            }

            popup.on(renameBtn, 'click', onRenameBtnClicked);
            popup.on(deleteBtn, 'click', onDeleteBtnClicked);
        });
    });
}

function handleNewPlaylistButtonClicked(e) {
    showFloatingInput(e.pageX, e.pageY, null, value => {
        window.api.createNewPlaylist(value);
    });
}

window.api.onPlaylistsLoaded(data => {
    renderPlaylistsNavigation(data.playlists);
});

window.api.onPlaylistsUpdated(data => {
    renderPlaylistsNavigation(data.playlists);
});

window.api.onPlaylistsFetchResponse(data => {
    renderPlaylistsNavigation(data.playlists);
});



// Fetch the initial data when loading or refreshing window
window.api.fetchPlaylists();

// Check if the module's HTML is already loaded
if (document.getElementById('playlistNav-navigation-module-load-checker')) {
    loadThisScript();
} else {
    // Otherwise, listen for the custom event
    document.addEventListener('navigation-module-loaded', loadThisScript);
}

// Cleanup
(() => {
    window.currentNavigationModuleCleanup = function cleanupPlaylistNavModule() {
        // Remove event listners
        for (let { target, event, handler, opts } of listners) {
            target.removeEventListener(event, handler, opts);
        }
        listners.length = 0;

        console.log('PlaylistsNav module has been cleaned up.')
    }
})();