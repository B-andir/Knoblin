// -----<  Button Events  >-----

const closeButton = document.getElementById('close-button');
const closeButtonEvent = closeButton.addEventListener('click', (event) => {
    window.api.controlWindow('close');
});

const minimizeButton = document.getElementById('minimize-button');
const minimizeButtonEvent = minimizeButton.addEventListener('click', (event) => {
    window.api.controlWindow('minimize');
});

const pinButton = document.getElementById('pin-button');
const pinButtonEvent = pinButton.addEventListener('click', async (event) => {
    const isPinned = await window.api.togglePin();
    
    // Update button color as visual feedback. Done with the "active" class.
    if (isPinned) {
        pinButton.classList.add('active');
    } else {
        pinButton.classList.remove('active')
    }
});


// -----<  Vertical Resize (Nav Panel)  >-----

const verticalDivider = document.getElementById('navVerticalDivider');
const navPanel = document.getElementById('nav');

verticalDivider.addEventListener('mousedown', (event) => {
    event.preventDefault();
    document.addEventListener('mousemove', resizeLeftPanel);
    document.addEventListener('mouseup', stopResizingLeftPanel);
})

function resizeLeftPanel(event) {
    // event.clientX gives the horizontal position of the cursor relative to the left edge of the window.
    const newWidth = event.clientX;
    if (newWidth > 150 && newWidth < 400) {
        navPanel.style.width = newWidth + 'px';
        updateCornerPosition();
    }

}

function stopResizingLeftPanel() {
    document.removeEventListener('mousemove', resizeLeftPanel);
    document.removeEventListener('mouseup', stopResizingLeftPanel);
}


// -----<  Horizontal Resize (Control Panel) >-----


const horizontalDivider = document.getElementById('controlHorizontalDivider');
const controlPanel = document.getElementById('control');
const contentPanel = document.getElementById('content');
const topMenu = document.getElementById('top-menu')

horizontalDivider.addEventListener('mousedown', (event) => {
    event.preventDefault();
    document.addEventListener('mousemove', resizeBottomPanel);
    document.addEventListener('mouseup', stopResizingBottomPanel);
})

function resizeBottomPanel(event) {
    // event.clientY gives the horizontal position of the cursor relative to the top edge of the window.
    // new height is the distance from the bottom of the window to current Y
    const containerHeight = document.documentElement.clientHeight;
    const newHeight = containerHeight - event.clientY;

    if (newHeight > 50 && newHeight < 200) {
        controlPanel.style.height = newHeight + 'px';
        const newOppositeHeight = containerHeight - newHeight - topMenu.offsetHeight;
        contentPanel.style.height = newOppositeHeight + 'px';
        navPanel.style.height = newOppositeHeight + 'px';
        updateCornerPosition();
    }

}

function stopResizingBottomPanel() {
    document.removeEventListener('mousemove', resizeBottomPanel);
    document.removeEventListener('mouseup', stopResizingBottomPanel);
}


// -----<  Corner Resize (Nav and Control Panels)  >-----
const cornerDivider = document.getElementById('navControlCornerDivider');

function updateCornerPosition() {
    const leftWidth = navPanel.offsetWidth;
    const bottomHeight = controlPanel.offsetHeight;
    const containerHeight = document.documentElement.clientHeight;

    // The corner is placed at the right edge of the Nav Panel and
    // at the top of the Control Panel (container height - panel height)
    cornerDivider.style.left = leftWidth + 'px';
    cornerDivider.style.top = (containerHeight - bottomHeight) + 'px';
}

window.addEventListener('load', updateCornerPosition);
window.addEventListener('resize', updateCornerPosition);

cornerDivider.addEventListener('mousedown', (event) => {
    event.preventDefault();
    document.addEventListener('mousemove', resizeBoth);
    document.addEventListener('mouseup', stopResizingBoth);
});

function resizeBoth(event) {
    resizeLeftPanel(event);
    resizeBottomPanel(event);
}

function stopResizingBoth() {
    document.removeEventListener('mousemove', resizeBoth);
    document.removeEventListener('mouseup', stopResizingBoth);
}

// -----<  Module Loading/Unloading  >-----

// Purely for designing! Remove when Playlist is done.
( async () => {
    switchContentModuleAsync('playlist', await window.api.getPlaylist('2ee45d69-f8b8-4a11-a75b-601dcdf9fedc'));
})();


// -----<  Control Bar Functionality  >-----

// Visuals
let selectedSection = null;
const controlSections = document.getElementsByClassName('control-segment')
document.addEventListener('DOMContentLoaded', () => {
    changeSelectedSection('music');
    
    Array.from(controlSections).forEach((element) => {

        // Expand on mouse over
        element.addEventListener('mouseover', (event) => {
            if (element.classList.contains("expanded")) return;

            element.classList.add("expanded");
            selectedSection.classList.remove("expanded");
        });

        // Return to selected on mouse out
        element.addEventListener('mouseout', (event) => {
            if (event.target == selectedSection) return;

            element.classList.remove("expanded");
            selectedSection.classList.add("expanded");
        });
    });
});

function changeSelectedSection(element) {
    console.log(typeof element);
    if (typeof element === "string") {
        if (element == "ambience") changeSelectedSection(0);
        else if (element == "music") changeSelectedSection(1);
        else if (element == "sfx") changeSelectedSection(2);
        else changeSelectedSection(4);
    } else if (typeof element == "number") {
        if (element >= 0 && element < controlSections.length) {
            selectedSection = controlSections.item(element);

            Array.from(controlSections).forEach((element) => {
                if (element == selectedSection) {
                    if (selectedSection.classList.contains('expanded')) return;
                    selectedSection.classList.add('expanded');
                    return;
                }

                if (element.classList.contains('expanded')) {
                    element.classList.remove('expanded');
                }
            });
        }
    }
}


// -----<  Navigation Bar Functionality  >-----

// Data Get/Send 
window.api.onPlaylistsLoaded(data => {
    console.log('Playlists Data Loaded: ', data);
});

window.api.onPlaylistsUpdated(data => {
    console.log('Playlists Data Updated: ', data);
});

// Adjust main volume
window.api.onBackendEvent('new-volume-main', (data) => {
    const mainVolumeSlider = document.getElementById('volume-slider-main');
    mainVolumeSlider.value = data.newVolume;
})