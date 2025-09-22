function createFloatingPopup(x = null, y = null, anchorElement = null, args = {}) {
    let isHorizontal = args.isHorizontal ?? false;
    let destroyOnNew = args.destroyOnNew ?? true;
    let closeOnMouseOut = args.closeOnMouseOut ?? true;
    let shouldBeOnLeft = args.shouldBeOnLeft ?? false;
    let specificHoverBoundsTarget = args.specificHoverBoundsTarget ?? null;
    let isHorizontalFlipped = shouldBeOnLeft;
    // remove any existing floating popup
    if (destroyOnNew) {
        const old = document.querySelector('.floating-popup-container');
        if (old && old._destroy) old._destroy();
    }

    // Pull the ID of anchor (or fallback)
    const anchor = anchorElement ?? null;

    // Build popup
    const container = document.createElement('div');
    container.className = 'floating-popup-container';
    container.style.position = 'absolute'
    container.style.zIndex = '990'
    document.body.append(container);

    const hoverRectTarget = specificHoverBoundsTarget ? specificHoverBoundsTarget : container;

    if (x == null || y == null) {
        positionPopup(container, anchorElement, { 'offsetPx': 2, 'shouldBeOnLeft': shouldBeOnLeft }, isHorizontal)
    } else {
        if (shouldBeOnLeft) {
            container.style.right = `${x}px`
        } else {
            container.style.left = `${x}px`
        }
        container.style.top = `${y}px`
    }

    const listners = [];

    if (anchorElement) {
        anchorElement.classList.add("stay-hovered");
    }

    function on(target, event, handler, opts) {
        target.addEventListener(event, handler, opts);
        listners.push({ target, event, handler, opts });
    }

    function positionPopup(popupEl, anchorElement, opts = {}, isHorizontal) {
        if (anchorElement == null) {
            return false;
        }
        anchorElement.classList.add('selected');
        const anchorRect = anchorElement.getBoundingClientRect();
        const offset = opts.offsetPx || 8;
        let { width: pw, height: ph } = popupEl.getBoundingClientRect();
        const vw = window.innerWidth, vh = window.innerHeight;

        if (opts.shouldBeOnLeft) {
            console.log(anchorRect);
            isHorizontalFlipped = true;
            let right = vw - anchorRect.right;
            let top = anchorRect.top;

            popupEl.style.right = right;
            popupEl.style.top = top;
            popupEl.style.bottom = anchorRect.bottom;

        } else {
            let left = !isHorizontal ? anchorRect.right + offset : anchorRect.left + (anchorRect.width - pw)/2;
            let top = !isHorizontal ? anchorRect.top : anchorRect.top - ph - offset;

            // flip horizontally if needed due to lack of space
            console.log((left + pw) + "\n" + (vw) + "\n" + (left) + "\n" + pw);
            if (left + pw > vw) {
                left = anchorRect.left - pw - offset;
                isHorizontalFlipped = true;
            }
            left = Math.max(offset, Math.min(left, vw - pw - offset));

            // flip vertically if needed due to lack of space
            if (top + ph > vh) {
                top = anchorRect.bottom - ph;
            }
            top = Math.max(offset, Math.min(top, vh - ph - offset));
            popupEl.style.left = `${left}px`;
            popupEl.style.top = `${top}px`
        }
    }

    // “click-outside” teardown
    function outsideClick(e) {
        const allPopups = document.querySelectorAll('.floating-popup-container');
        let contains = false;
        allPopups.forEach(element => {
            if (element.contains(e.target)) contains = true;
        });
        if (!contains) destroy();
    }

    // “mouse-move” watcher to close when you leave both anchorElement and popup
    function onMouseMove(e) {
        const zone = 7; // Pixel size of 'grace-zone'
        const leftZone = zone + 12; // Left-specific 'grace-zone'. Flip to right side if window is flipped.
        const mx = e.clientX;
        const my = e.clientY;
        const pr = container.getBoundingClientRect()
        const ar = hoverRectTarget
            ? hoverRectTarget.getBoundingClientRect()
            : null;

        // helper: is (mx,my) inside rect expanded by 'zone'?
        function hit(rect) {
            return  mx >= rect.left - (isHorizontalFlipped ? zone : leftZone) &&
                    mx <= rect.right + (isHorizontalFlipped ? leftZone : zone) &&
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
    if (closeOnMouseOut) on(document, 'mousemove', onMouseMove);

    function destroy() {
        for (let { target, event, handler, opts } of listners) {
            target.removeEventListener(event, handler, opts);
        }
        listners.length = 0;
        if (anchorElement) anchorElement.classList.remove('stay-hovered');

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
        anchor
    };
}