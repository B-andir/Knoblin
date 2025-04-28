const contentContainer = document.getElementById('content');
const navigationContainer = document.getElementById('navigation');

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

function loadModuleScript(moduleName, moduleType) {
    if (moduleType != "content" && moduleType != "navigation") {
        console.error(`Invalid module type! No modules of type '${moduleType}'`)
        return;
    }

    const script = document.createElement('script');
    script.src = `modules/${moduleType}/${moduleName}/${moduleName}.js`;
    script.id = `${moduleType}-script-${moduleName}`;
    script.onload = () => console.log(`${moduleName}.js loaded successfully`);
    script.onerror = () => console.error(`Error loading ${moduleName}.js`);
    document.body.appendChild(script);
    return script;
}

function loadModuleHTML(moduleName, moduleType) {
    if (moduleType != "content" && moduleType != "navigation") {
        console.error(`Invalid module type! No modules of type '${moduleType}'`)
        return;
    }

    let container = moduleType == "content" ? contentContainer : navigationContainer;

    const moduleContainer = document.createElement('div');
    moduleContainer.id = `${moduleType}-module-${moduleName}`;
    container.appendChild(moduleContainer);

    fetch(`modules/${moduleType}/${moduleName}/${moduleName}.html`)
        .then(response => {
            if (!response.ok) throw new Error('Network error');
            return response.text();
        })
        .then(htmlContent => {
            container.innerHTML = htmlContent;
            container.dispatchEvent(new CustomEvent(`${moduleType}-module-loaded`, { 
                bubbles: true,
                detail: moduleName 
            }));
        })
        .catch(err => console.error(`Error loading ${moduleName} HTML:`, err));

    return moduleContainer;
}

function unloadContentModule(moduleName) {

    // Call the cleanup function if it exists
    if (typeof window.currentContentModuleCleanup === 'function') {
        window.currentContentModuleCleanup();
        delete window.currentContentModuleCleanup;
    }

    // Remove the HTML container.
    const moduleContainer = document.getElementById(`content-module-${moduleName}`);
    if (moduleContainer) {
      moduleContainer.remove();
    }
    
    // Remove the script element.
    const script = document.getElementById(`content-script-${moduleName}`);
    if (script) {
      script.remove();
    }
}

function unloadNavigationModule(moduleName) {

    // Call the cleanup function if it exists
    if (typeof window.currentNavigationModuleCleanup === 'function') {
        window.currentNavigationModuleCleanup();
        delete window.currentNavigationModuleCleanup;
    }

    // Remove the HTML container.
    const moduleContainer = document.getElementById(`navigation-module-${moduleName}`);
    if (moduleContainer) {
      moduleContainer.remove();
    }
    
    // Remove the script element.
    const script = document.getElementById(`navigation-script-${moduleName}`);
    if (script) {
      script.remove();
    }
}

function switchContentModule(newModuleName) {

    if (window.currentContentModule) {
        unloadContentModule(window.currentContentModule)
    }

    window.currentContentModule = newModuleName;

    loadModuleHTML(newModuleName, 'content');
    loadModuleScript(newModuleName, 'content');
}

function switchNavigationModule(newModuleName) {

    if (window.currentNavigationModule) {
        unloadNavigationModule(window.currentNavigationModule)
    }

    window.currentNavigationModule = newModuleName;

    loadModuleHTML(newModuleName, 'navigation');
    loadModuleScript(newModuleName, 'navigation');
}

switchContentModule('playlist');
switchNavigationModule('playlistsNav');


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