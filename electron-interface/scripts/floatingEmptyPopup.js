function createFloatingPopup(x = 0, y = 0, anchorElement = null, isHorizontal = false) {
    // remove any existing floating popup
    const old = document.querySelector('.floating-popup-container');
    if (old && old._destroy) old._destroy();

    // Pull the ID of anchor (or fallback)
    const anchorId = anchorElement.id || null;

    // Build popup
    const container = document.createElement('div');
    container.className = 'floating-popup-container';
    container.style.top = `${y}px`
    container.style.left = `${x}px`
    container.style.position = 'absolute'
    container.style.zIndex = '990'
    document.body.append(container);

    positionPopup(container, anchorElement, { 'offsetPx': 2 })

    const listners = [];

    function on(target, event, handler, opts) {
        console.log(target);
        console.log(event);
        target.addEventListener(event, handler, opts);
        listners.push({ target, event, handler, opts });
    }

    function positionPopup(popupEl, anchorElement, opts = {}, isHorizontal) {
        if (anchorElement == null) {
            return false;
        }
        const anchorRect = anchorElement.getBoundingClientRect();
        const offset = opts.offsetPx || 8;
        let { width: pw, height: ph } = popupEl.getBoundingClientRect();
        const vw = window.innerWidth, vh = window.innerHeight;

        let left = !isHorizontal ? anchorRect.right + offset : anchorRect.left + (anchorRect.width - pw)/2;
        let top = !isHorizontal ? anchorRect.top : anchorRect.top - ph - offset;

        // flip horizontally if needed due to lack of space
        if (left + pw > vw) {
            left = anchorRect.left - pw - offset;
        }
        left = Math.max(offset, Math.min(left, vw - pw - offset));

        // flip vertically if needed due to lack of space
        if (top + ph > vh) {
            top = anchorRect.bottom - ph;
        }
        top = Math.max(offset, Math.min(top, vh - ph - offset));

        popupEl.style.left = `${left}px`;
        popupEl.style.top = `${top}px`
        return true;
    }

    // “click-outside” teardown
    function outsideClick(e) {
        if (!container.contains(e.target)) destroy();
    }

    // “mouse-move” watcher to close when you leave both anchorElement and popup
    function onMouseMove(e) {
        const zone = 7; // Pixel size of 'grace-zone'
        const mx = e.clientX;
        const my = e.clientY;
        const pr = container.getBoundingClientRect();
        const ar = anchorElement
            ? anchorElement.getBoundingClientRect()
            : null;

        // helper: is (mx,my) inside rect expanded by 'zone'?
        function hit(rect) {
            return  mx >= rect.left - zone &&
                    mx <= rect.right + zone &&
                    my >= rect.top - zone &&
                    my <= rect.bottom + zone;
        }

        const inPopup = hit(pr);
        const inAnchor = ar && hit(ar);
        const otherPopup = document.querySelector('.floating-input-container');
        const inNestedPopup = otherPopup && otherPopup.contains(e.target);

        // Old function, without a 'grace zone'
        // const inPopup = container.contains(e.target);
        // const inAnchor = anchorElement && anchorElement.contains(e.target);
        if (!inPopup && !inAnchor && !inNestedPopup) destroy()
    }

    // Add event listeners through own 'on' function
    on(document, 'mousedown', outsideClick);
    if (anchorElement != null) on(document, 'mousemove', onMouseMove);

    function destroy() {
        for (let { target, event, handler, opts } of listners) {
            target.removeEventListener(event, handler, opts);
        }
        listners.length = 0;

        container.remove();
    }
    
    // expose an API
    // - callers can do popup.on(container, 'click', ...)
    // - destroy() is run automatically on outside-click or mouse-leave
    container._destroy = destroy;
    return {
        container,
        // overload `on` to let callers specify the target themselves:
        on: (targetOrEvent, maybeEvent, maybeHandler, maybeOpts) => {
          // if first arg is a string, assume the old 3-arg form
          if (typeof targetOrEvent === 'string') {
            on(container, targetOrEvent, maybeEvent, maybeHandler);
          } else {
            // otherwise they passed (target, event, handler[, opts])
            on(targetOrEvent, maybeEvent, maybeHandler, maybeOpts);
          }
        },
        destroy,
        anchorId
    };
}