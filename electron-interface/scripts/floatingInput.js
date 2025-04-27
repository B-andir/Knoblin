function showFloatingInput(x, y, callback) {
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
    input.placeholder = 'New Playlist';

    const btn = document.createElement('button');
    btn.className = 'floating-input-button';
    btn.textContent = '✓';

    container.append(input, btn);
    document.body.append(container);
    input.focus();

    const cleanup = () => {
        container.remove();
        document.removeEventListener('mousedown', outsideClick);
    }

    btn.addEventListener('click', () => {
        const val = input.value.trim();
        if (val) callback(val);
        cleanup();
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const val = input.value.trim();
            if (val) callback(val);
            cleanup();
        } else if (e.key === 'Escape') {
            cleanup();
        }
    });
    
    function outsideClick(e) {
        if (!container.contains(e.target)) cleanup();
    }

    document.addEventListener('mousedown', outsideClick);
}
