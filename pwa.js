(function () {
    "use strict";

    const stopBrowserGesture = event => {
        if (event.cancelable) event.preventDefault();
    };

    document.addEventListener("gesturestart", stopBrowserGesture, { passive: false });
    document.addEventListener("gesturechange", stopBrowserGesture, { passive: false });
    document.addEventListener("gestureend", stopBrowserGesture, { passive: false });
    document.addEventListener("dblclick", stopBrowserGesture, { passive: false });
    document.addEventListener("dragstart", stopBrowserGesture, { passive: false });
    document.addEventListener("selectstart", stopBrowserGesture, { passive: false });

    let lastTouchEnd = 0;
    document.addEventListener("touchend", event => {
        const now = Date.now();
        if (now - lastTouchEnd < 300 && event.cancelable) event.preventDefault();
        lastTouchEnd = now;
    }, { passive: false });

    if ("serviceWorker" in navigator && window.isSecureContext) {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("./service-worker.js").catch(() => {});
        });
    }
})();
