(function () {
    "use strict";

    function bindHold(button, keys, keyName) {
        const release = event => {
            if (event) event.preventDefault();
            keys[keyName] = false;
            button.classList.remove("is-pressed");
        };

        button.addEventListener("pointerdown", event => {
            event.preventDefault();
            keys[keyName] = true;
            button.classList.add("is-pressed");
            if (button.setPointerCapture) button.setPointerCapture(event.pointerId);
        });
        button.addEventListener("pointerup", release);
        button.addEventListener("pointercancel", release);
        button.addEventListener("lostpointercapture", release);
        return release;
    }

    function bindJump(button, onJump) {
        const release = event => {
            if (event) event.preventDefault();
            button.classList.remove("is-pressed");
        };

        button.addEventListener("pointerdown", event => {
            event.preventDefault();
            button.classList.add("is-pressed");
            onJump();
            if (button.setPointerCapture) button.setPointerCapture(event.pointerId);
        });
        button.addEventListener("pointerup", release);
        button.addEventListener("pointercancel", release);
        button.addEventListener("lostpointercapture", release);
        return release;
    }

    window.setupMobileControls = function ({ keys, onJump, root = document }) {
        const left = root.querySelector("[data-control='left']");
        const right = root.querySelector("[data-control='right']");
        const jump = root.querySelector("[data-control='jump']");
        if (!left || !right || !jump || !keys || typeof onJump !== "function") return;

        const releases = [
            bindHold(left, keys, "ArrowLeft"),
            bindHold(right, keys, "ArrowRight"),
            bindJump(jump, onJump)
        ];

        window.addEventListener("blur", () => releases.forEach(release => release()));
        document.addEventListener("contextmenu", event => {
            if (event.target.closest(".mobile-controls")) event.preventDefault();
        });
    };
})();
