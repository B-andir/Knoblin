function showFloatingInput(x, y, text, callback) {
    console.log('Called Floating Input');
    // Remove any existing floating input
    const existing = document.querySelector('.floating-input-container');
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.className = 'floating-input-container';
    container.style.top = `${y}px`;
    container.style.left = `${x}px`;

    const input = document.createElement('input');
    input.className = 'floating-input-text';
    input.type = 'text';
    input.value = text || "";
    input.placeholder = 'New Playlist';

    const btn = document.createElement('button');
    btn.className = 'floating-input-button';
    btn.textContent = '✓';

    container.append(input, btn);
    document.body.append(container);
    input.focus();

    function onBtnClick() {
        const val = input.value.trim();
        if (val) callback(val);
        cleanup();
    }

    function onInputKeydown(e) {
        if (e.key === 'Enter') {
            const val = input.value.trim();
            callback(val && val.length >= 0 ? val : 'New Playlist');
            cleanup();
        } else if (e.key === 'Escape') {
            cleanup();
        }
    }

    const cleanup = () => {
        btn.removeEventListener('click', onBtnClick);
        input.addEventListener('keydown', onInputKeydown);
        document.removeEventListener('mousedown', outsideClick);
        container.remove();
    }

    btn.addEventListener('click', onBtnClick);

    input.addEventListener('keydown', onInputKeydown);
    
    function outsideClick(e) {
        if (!container.contains(e.target)) cleanup();
    }

    document.addEventListener('mousedown', outsideClick);
}
