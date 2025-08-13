function attachCustomScrollbar(root, module) {
    const content = root.querySelector('.scroll-content');
    const track = root.querySelector('.scrollbar');
    const thumb = root.querySelector('.thumb');

    let dragging = false;
    let dragStartY = 0;
    let startScrollTop = 0;

    function update() {
        const ch = content.clientHeight;
        const sh = content.scrollHeight;
        const th = track.clientHeight;

        if (ch >= sh) {
            track.style.display = 'none';
            return;
        }
        track.style.display = 'block';

        const ratio = ch / sh;
        const thumbHeight = Math.max(24, Math.round(th * ratio));
        const maxThumbTop = th - thumbHeight;
        const maxScrollTop = sh - ch;
        const thumbTop = maxScrollTop > 0
            ? Math.round((content.scrollTop / maxScrollTop) * maxThumbTop)
            : 0;

        thumb.style.height = `${thumbHeight}px`;
        thumb.style.top = `${thumbTop}px`;
    }

    module.on(content, 'scroll', update);
    module.on(window, 'resize', update);
    new ResizeObserver(update).observe(content);

    // Drag to scroll
    module.on(thumb, 'mousedown', e => {
        dragging = true;
        dragStartY = e.clientY;
        startScrollTop = content.scrollTop;
        track.style.pointerEvents = 'auto';
        e.preventDefault();
    });

    module.on(window, 'mousemove', e => {
        if (!dragging) return;
        const ch = content.clientHeight;
        const sh = content.scrollHeight;
        const th = track.clientHeight;
        const thumbHeight = Math.max(24, Math.round(th * (ch / sh)));
        const maxThumbTop = th - thumbHeight;
        const maxScrollTop = sh - ch;

        const deltaY = e.clientY - dragStartY;
        const scrollPerPixel = maxScrollTop / maxThumbTop;
        content.scrollTop = startScrollTop + deltaY * scrollPerPixel;
    });

    module.on(window, 'mouseup', e => {
        if (dragging) {
            dragging = false;
            track.style.pointerEvents = 'none';
        }
    });

    update();
}