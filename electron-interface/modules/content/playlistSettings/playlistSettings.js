// === Class Definition ===
(() => {
    class PlaylistSettingsModule {
        #listeners = [];
        #data;
        #savedSettings;

        // data = playlist object
        constructor(data) {
            this.#data = data;
            this.#savedSettings = {}
            this.init();
        }

        init(_data = null) {
            console.log("Load PlaylistSettings module");

            if (_data) {
                this.#data = _data;
            }

            const data = this.#data;

            const nameInput = document.getElementById('fname');
            nameInput.value = data.name;
            const colorIcon = document.getElementById('circleIcon');
            if (data.color === null) {
                data.color = "#00000000";
            }
            
            colorIcon.style.backgroundColor = data.color;

            const layerInput = document.getElementById('flayer');
            layerInput.value = data.layer;

            // Color selection
            this.#on(colorIcon, 'click', async (e) => {
                    const el = e.target.closest('.playlistIcon');
                    if (!el) return;
        
                    const popup = createFloatingPopup(null, null, el, { destroyOnNew: false, closeOnMouseOut: false });
        
                    popup.container.classList.add('playlistIconPopup');

                    const setNewColor = this.#setNewColor;
        
                    updateColorSelection();
        
                    async function updateColorSelection() {
                        async function getCustomColorDivs() {
                            let dynamicColorDivs = "";
                            try {
                                const colors = await window.api.getPlaylistColors()
                            
                                dynamicColorDivs = await colors.map(color => `<div class="button existingColor circleIcon" data-bgcolor="${color}" ></div>`).join('');
                                
                            } catch (err) {
                                console.error("Couldn't load color data:", err)
                                return
                            }
        
                            return dynamicColorDivs;
                        }
        
                        getCustomColorDivs().then(dynamicColorDivs => {
            
                            const htmlText = `
                                <div class="button existingColor circleIcon" data-bgcolor="#00000000"></div>
                                <div class="button existingColor circleIcon" data-bgcolor="#c71c10"></div>
                                <div class="button existingColor circleIcon" data-bgcolor="#11c5cf"></div>
                                <div class="button existingColor circleIcon" data-bgcolor="#69d932"></div>
                                <div class="button existingColor circleIcon" data-bgcolor="#f0609c"></div>
                                <div class="button existingColor circleIcon" data-bgcolor="#fa9405"></div>
                                
                                ${dynamicColorDivs}
            
                                <div class="button newColorSelection circleIcon" data-bgcolor="#ffffff">
                                    <svg id="plus-24px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                        <path fill="currentColor" id="plus-24px-2" data-name="plus-24px" d="M23,11H13V1a1,1,0,0,0-2,0V11H1a1,1,0,0,0,0,2H11V23a1,1,0,0,0,2,0V13H23a1,1,0,0,0,0-2Z"/>
                                    </svg>
                                    <input type="color" id="newColorPicker" name="newColorPicker" value="#ffffff">
                                    <div id="colorPickerConfirm"></div>
                                </div>
                            `;
            
            
                            popup.container.innerHTML = htmlText;
            
                            document.querySelectorAll('.existingColor').forEach(el => {
                                el.style.setProperty('--bg', el.dataset.bgcolor);
        
                                popup.on(el, 'click', e => {
                                    // window.api.setPlaylistColor(data.id, el.dataset.bgcolor);
                                    setNewColor(el.dataset.bgcolor);
                                    popup.destroy();
                                    // reload();
                                });
        
                                popup.on(el, 'contextmenu', e => {
                                    const menu = createFloatingPopup(e.pageX, e.pageY, el, { destroyOnNew: false });
                                    menu.container.classList.add('confirmDeleteMenu');
                                    menu.container.innerHTML = `<div id="confirmDeleteButton">Delete?</div>`
        
                                    const deleteColorButton = document.querySelector('#confirmDeleteButton');
                                    menu.on(deleteColorButton, 'click', e => {
                                        window.api.removePlaylistColor(el.dataset.bgcolor);
                                        menu.destroy();
                                        updateColorSelection();
                                    });
                                });
                            });
        
                            const newColorButton = document.querySelector('.newColorSelection');
                            const newColorInput = document.querySelector('#newColorPicker');
                            const newColorConfirmButton = document.querySelector('#colorPickerConfirm');
                            let isPickerOpen = false;
                
                            function showConfirmButton() {
                                newColorConfirmButton.classList.add('active');
                            }
                
                            function hideConfirmButton() {
                                setTimeout(() => {
                                    newColorConfirmButton.classList.remove('active')
                                }, 10);
                            }
                
                            popup.on(newColorInput, 'click', () => {
                                setTimeout(() => {
                                    isPickerOpen = document.activeElement === newColorInput;
                
                                    if (isPickerOpen) {
                                        showConfirmButton();
                                    }
                                }, 0);
                            })
                
                            popup.on(newColorInput, 'input', () => {
                                const c = newColorInput.value;
                                newColorButton.setAttribute('data-color', c);
                                newColorButton.style.setProperty('--current', c);
                            });
                
                            popup.on(newColorInput, 'change', () => {
                                isPickerOpen = false;
                                hideConfirmButton();
                                
                                console.log("Save new color");
                                console.log(newColorInput.value);
                                window.api.newPlaylistColor(newColorInput.value);
                                
                                setTimeout(() => {
                                    updateColorSelection();
                                }, 10);
                
                                console.log('Picker closed (selection)');
                            });
                
                            
                            popup.on(newColorInput, 'blur', () => {
                                isPickerOpen = false;
                                hideConfirmButton();
                                console.log('Picker closed (blur)');
                            });
                        });
                    }
        
            });

            // -- Form input event listeners

            this.#on(nameInput, 'input', this.#handleInputChange);
            this.#on(layerInput, 'input', this.#handleInputChange);

            // -- Form Submit
            const form = document.getElementById('settingsForm');
            this.#on(form, 'submit', async (e) => {
                e.preventDefault();

                if (Object.keys(this.#savedSettings).length === 0) {
                    console.log('No changes to submit');
                    return;
                }

                let playlist = await window.api.setPlaylistSettings(this.#data.id, this.#savedSettings)
                if (playlist) {
                    console.log('Playlist settings saved! Reloading...');
                    switchContentModuleAsync('playlistSettings', playlist);
                } else {
                    console.warn('Could not save playlist settings');
                }
            });

            console.log("PlaylistSettings Module has been loaded");
        }
        
        #on(target, event, handler, opts) {
            target.addEventListener(event, handler, opts);
            this.#listeners.push({ target, event, handler, opts });
        }

        #off(target, event, handler, opts) {
            target.removeEventListener(event, handler, opts);
        }

        parseValue(input) {
            const numValue = Number(input);
            return isNaN(numValue) ? input : numValue;
        }

        #handleInputChange = (event) => {
            const element = event.target;
            const settingSection = element.closest('.settingSection');
            const fieldName = element.name;
            const key = fieldName;

            let value = this.parseValue(element.value);

            let newSetting = { key, value }
            this.#newSetting(settingSection, newSetting)
        }

        cleanup() {
            console.log("Cleanup PlaylistSettings module");

            // Remove event listners
            for (let { target, event, handler, opts } of this.#listeners) {
                target.removeEventListener(event, handler, opts);
            }

            // Clear Timeouts
            

            // Cleanup global variables
            this.#listeners = [];
            this.#data = null;
            this.#savedSettings = null;
            
            console.log('PlaylistSettings module has been cleaned up.')

            return true;
        }

        #newSetting(settingSection, setting) {
            if (this.#data[setting.key] === setting.value) {
                settingSection.classList.remove("hasNew");
                delete this.#savedSettings[setting.key];
                return;
            }

            settingSection.classList.add("hasNew");

            this.#savedSettings[setting.key] = setting.value;
        }

        #setNewColor = (newColor) => {
            const colorIcon = document.getElementById('circleIcon');

            // this.#savedSettings.color = newColor;
            let newSetting = { 'key': 'color', 'value': newColor}
            this.#newSetting(document.getElementById('colorSection'), newSetting)
            colorIcon.style.backgroundColor = newColor;
        }
    }


    // === Global Interface ===
    let instance = null;

    // Init
    window.initContentPlaylistSettings = function initPlaylistSettings(data) {
        console.log("Try load PlaylistSettings Module");
        instance = new PlaylistSettingsModule(data);
    };


    // Cleanup
    window.currentContentModuleCleanup = function cleanupPlaylistSettingsModule() {
        console.log("Try cleanup PlaylistSettings Module");
        if (instance) {
            instance.cleanup();
            instance = null;
        }
    }
})();