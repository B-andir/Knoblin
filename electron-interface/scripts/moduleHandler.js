// function loadModuleScript(moduleName, moduleType) {
//     if (moduleType != "content" && moduleType != "navigation") {
//         console.error(`Invalid module type! No modules of type '${moduleType}'`)
//         return;
//     }

//     const script = document.createElement('script');
//     script.src = `modules/${moduleType}/${moduleName}/${moduleName}.js`;
//     script.id = `${moduleType}-script-${moduleName}`;
//     script.onload = () => {
//         document.dispatchEvent(new CustomEvent(`${moduleType}-module-script-loaded`, {
//             detail: { moduleName, moduleData }
//         }));
//     }
//     script.onerror = () => console.error(`Error loading ${moduleName}.js`);
//     document.body.appendChild(script);
//     return script;
// }

// function loadModuleHTML(moduleName, moduleType, moduleData = {}) {
//     if (moduleType != "content" && moduleType != "navigation") {
//         console.error(`Invalid module type! No modules of type '${moduleType}'`)
//         return;
//     }

//     let container = moduleType == "content" ? document.getElementById('content') : document.getElementById('navigation');

//     const moduleContainer = document.createElement('div');
//     moduleContainer.id = `${moduleType}-module-${moduleName}`;
//     container.appendChild(moduleContainer);

//     fetch(`modules/${moduleType}/${moduleName}/${moduleName}.html`)
//         .then(response => {
//             if (!response.ok) throw new Error('Network error');
//             return response.text();
//         })
//         .then(htmlContent => {
//             container.innerHTML = htmlContent;
//             container.dispatchEvent(new CustomEvent(`${moduleType}-module-loaded`, { 
//                 bubbles: true,
//                 detail: { moduleName, moduleData } 
//             }));
//         })
//         .catch(err => console.error(`Error loading ${moduleName} HTML:`, err));

//     return moduleContainer;
// }

async function unloadContentModule() {
    if (!window.currentContentModule) return;
    const moduleName = window.currentContentModule;

    // Call the cleanup function if it exists
    if (typeof window.currentContentModuleCleanup === 'function') {
        window.currentContentModuleCleanup();
        delete window.currentContentModuleCleanup;
    }

    // Cleanup the HTML container.
    const moduleContainer = document.getElementById(`content-module-${moduleName}`);
    if (moduleContainer) {
        moduleContainer.remove();
        document.getElementById('content').innerHTML = '';
    }

    // Remove the old CSS stylesheet
    const oldCss = document.getElementById(`content-css-${moduleName}`);
    if (oldCss) oldCss.remove();
    
    // Remove the old script element.
    const oldScript = document.getElementById(`content-script-${moduleName}`);
    if (oldScript) oldScript.remove();
}

async function unloadNavigationModule() {
    if (!window.currentNavigationModule) return;
    const moduleName = window.currentNavigationModule;

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

    // Remove the old CSS stylesheet
    const oldCss = document.getElementById(`navigation-css-${moduleName}`);
    if (oldCss) oldCss.remove();
    
    // Remove the script element.
    const script = document.getElementById(`navigation-script-${moduleName}`);
    if (script) {
      script.remove();
    }
}

// function switchContentModule(newModuleName, data = {}) {

//     unloadContentModule()

//     window.currentContentModule = newModuleName;

//     loadModuleHTML(newModuleName, 'content', data);
//     loadModuleScript(newModuleName, 'content', data);
// }

// function switchNavigationModule(newModuleName, data = {}) {

//     unloadNavigationModule()

//     window.currentNavigationModule = newModuleName;

//     loadModuleHTML(newModuleName, 'navigation', data);
//     loadModuleScript(newModuleName, 'navigation', data);
// }

async function switchContentModuleAsync(name, data = {}) {
    // 1) unload existing module
    await unloadContentModule()
    
    // 2) Start loading CSS, HTML, & JS in parallel
    const cssPromise = new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `styles/compiled/content-${name}.css`;
        link.id = `content-css-${name}`;
        link.onload = () => resolve();
        link.onerror = () => reject(new Error(`Failed to load CSS for content module ${name}`));
        document.head.appendChild(link);
    })
    const htmlPromise = fetch(`modules/content/${name}/${name}.html`).then(r => r.text());
    const scriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `modules/content/${name}/${name}.js`;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script for content module ${name}`));
        document.body.appendChild(script);
    })

    // 3) wait for both
    const [ css, html, script ] = await Promise.all([ cssPromise, htmlPromise, scriptPromise ]);

    // 4) inject + init in one go
    const container = document.getElementById('content');
    container.innerHTML = html;
    const initScript = window[`initContent${capitalize(name)}`];
    if (typeof initScript === "function") {
        initScript(data);
    }
    

    window.currentContentModule = name;
}

async function switchNavigationModuleAsync(name, data = {}) {
    // 1) unload existing module
    await unloadNavigationModule()
    
    // 2) Start loading CSS, HTML, & JS in parallel
    const cssPromise = new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `styles/compiled/navigation-${name}.css`;
        link.id = `content-css-${name}`;
        link.onload = () => resolve();
        link.onerror = () => reject(new Error(`Failed to load CSS for navigation module ${name}`));
        document.head.appendChild(link);
    })
    const htmlPromise = fetch(`modules/navigation/${name}/${name}.html`).then(r => r.text());
    const scriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `modules/navigation/${name}/${name}.js`;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script for navigation module ${name}`));
        document.body.appendChild(script);
    })

    // 3) wait for both
    const [ css, html, script] = await Promise.all([ cssPromise, htmlPromise, scriptPromise ]);

    // 4) inject + init in one go
    const container = document.getElementById('navigation');
    container.innerHTML = html;
    const initScript = window[`initNavigation${capitalize(name)}`];
    if (typeof initScript === "function") {
        initScript(data);
    }

    window.currentNavigationModule = name;
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}