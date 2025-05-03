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