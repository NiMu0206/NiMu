(() => {
    "use strict";

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const TRACKS = {
        title:  { bpm: 112, lead: [72,76,79,84,79,76,74,79,72,76,79,86,84,79,76,null,74,77,81,86,84,81,79,76,72,74,76,79,84,null,79,null], harmony: [64,null,67,null,65,null,67,null], bass: [48,null,55,null,53,null,55,null] },
        stage1: { bpm: 148, drums: true, lead: [72,74,76,79,76,74,72,67,69,72,76,74,72,69,67,null,72,76,79,81,79,76,74,72,74,77,81,79,76,74,72,null], harmony: [64,null,67,null,65,null,67,null,64,null,69,null,65,null,67,null], bass: [48,null,55,null,53,null,55,null,48,null,57,null,53,null,55,null] },
        clear:  { bpm: 132, lead: [72,76,79,84,79,84,88,91,88,91,96,null], harmony: [64,null,67,null,72,null], bass: [48,null,52,null,55,null,60,null] },
        stage2: { bpm: 126, drums: true, lead: [69,null,72,71,69,67,64,null,67,null,71,69,67,64,62,null,69,72,76,74,72,69,67,null,64,67,71,69,68,64,62,null], harmony: [57,null,60,null,59,null,55,null,57,null,62,null,59,null,55,null], bass: [45,null,40,null,43,null,38,null,45,null,41,null,43,null,40,null] },
        boss:   { bpm: 176, drums: true, lead: [62,62,65,62,69,68,65,62,60,60,64,60,67,65,64,60,62,65,69,70,69,65,62,60,57,60,64,67,65,64,60,null], harmony: [50,null,53,null,57,null,53,null,48,null,52,null,55,null,52,null], bass: [38,null,38,41,38,null,36,33,38,41,43,41,38,36,33,null] },
        ending: { bpm: 102, lead: [72,76,79,84,83,79,76,null,74,77,81,86,84,81,79,null,76,79,84,88,86,84,81,79,77,81,84,89,88,84,81,null], harmony: [64,null,67,null,69,null,67,null,65,null,69,null,72,null,69,null], bass: [48,null,55,null,53,null,57,null,48,null,55,null,53,null,60,null] }
    };

    const file = location.pathname.split("/").pop() || "index.html";
    const trackName = file === "game.html" ? "stage1"
        : file === "stage1-clear.html" ? "clear"
        : file === "stage2.html" ? "stage2"
        : file === "boss.html" ? "boss"
        : file === "ending.html" ? "ending"
        : "title";
    const track = TRACKS[trackName];
    const baseBpm = track.bpm;

    let audioContext = null;
    let master = null;
    let nextNoteTime = 0;
    let step = 0;
    let scheduler = 0;
    let started = false;
    let muted = false;

    try { muted = localStorage.getItem("megumi-bgm-muted") === "1"; } catch (_) {}

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", "BGMのオン・オフ");
    Object.assign(button.style, {
        position: "fixed",
        zIndex: "10000",
        top: "max(10px, env(safe-area-inset-top))",
        right: "max(12px, env(safe-area-inset-right))",
        width: "44px",
        height: "44px",
        padding: "0",
        border: "1px solid rgba(255,255,255,.7)",
        borderRadius: "50%",
        background: "rgba(8,8,18,.48)",
        color: "white",
        fontSize: "21px",
        lineHeight: "42px",
        textAlign: "center",
        cursor: "pointer",
        touchAction: "manipulation",
        WebkitUserSelect: "none",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent"
    });

    function refreshButton() {
        button.textContent = muted ? "🔇" : "🔊";
        button.style.opacity = muted ? ".62" : "1";
    }

    function midiToFrequency(note) {
        return 440 * Math.pow(2, (note - 69) / 12);
    }

    function playTone(note, time, duration, type, volume) {
        if (note == null || !audioContext || !master) return;
        const oscillator = audioContext.createOscillator();
        const envelope = audioContext.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(midiToFrequency(note), time);
        envelope.gain.setValueAtTime(0.0001, time);
        envelope.gain.exponentialRampToValueAtTime(volume, time + 0.018);
        envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration * 0.88);
        oscillator.connect(envelope).connect(master);
        oscillator.start(time);
        oscillator.stop(time + duration);
    }

    function scheduleStep(time) {
        const beat = 60 / track.bpm;
        const duration = beat * 0.48;
        playTone(track.lead[step % track.lead.length], time, duration, "square", 0.09);
        if (track.harmony && step % 2 === 1) {
            playTone(track.harmony[step % track.harmony.length], time, duration * 1.45, "sine", 0.055);
        }
        if (step % 2 === 0) {
            playTone(track.bass[Math.floor(step / 2) % track.bass.length], time, beat * 0.9, "triangle", 0.12);
        }
        if (track.drums && step % 4 === 0) playDrum(time, step % 8 === 0 ? 105 : 82);
    }

    function playDrum(time, startFrequency) {
        if (!audioContext || !master) return;
        const oscillator = audioContext.createOscillator();
        const envelope = audioContext.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(startFrequency, time);
        oscillator.frequency.exponentialRampToValueAtTime(42, time + 0.09);
        envelope.gain.setValueAtTime(0.16, time);
        envelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.11);
        oscillator.connect(envelope).connect(master);
        oscillator.start(time);
        oscillator.stop(time + 0.12);
    }

    async function playEffect(name) {
        if (muted) return;
        await startMusic();
        if (!audioContext) return;
        const now = audioContext.currentTime + 0.005;
        if (name === "jump") {
            playTone(76, now, 0.08, "square", 0.24);
            playTone(81, now + 0.055, 0.11, "square", 0.2);
        } else if (name === "stomp") {
            playTone(55, now, 0.08, "square", 0.3);
            playTone(48, now + 0.045, 0.14, "triangle", 0.28);
        } else if (name === "star") {
            [79, 84, 88].forEach((note, i) => playTone(note, now + i * 0.055, 0.13, "sine", 0.24));
        } else if (name === "damage") {
            [48, 44, 40].forEach((note, i) => playTone(note, now + i * 0.05, 0.12, "sawtooth", 0.22));
        } else if (name === "victory") {
            [72, 76, 79, 84, 88].forEach((note, i) => playTone(note, now + i * 0.09, 0.22, "square", 0.2));
        } else if (name === "shock") {
            [45, 40, 33].forEach((note, i) => playTone(note, now + i * 0.035, 0.2, "sawtooth", 0.28));
        } else if (name === "charge") {
            [55, 59, 62, 67, 71].forEach((note, i) => playTone(note, now + i * 0.075, 0.2, "sine", 0.22));
        } else if (name === "bossDoor") {
            [45, 52, 57, 64, 69].forEach((note, i) => playTone(note, now + i * 0.13, 0.34, i < 2 ? "triangle" : "square", 0.2));
        } else if (name === "awaken") {
            [45, 52, 57, 64, 69, 76].forEach((note, i) => playTone(note, now + i * 0.11, 0.3, "sawtooth", 0.2));
        } else if (name === "verticalBeam") {
            [76, 64, 52, 40].forEach((note, i) => playTone(note, now + i * 0.025, 0.18, "square", 0.27));
        } else if (name === "bossEntrance") {
            [38, 38, 45, 50].forEach((note, i) => playTone(note, now + i * 0.12, 0.32, "sawtooth", 0.24));
        } else if (name === "finalHit") {
            [60, 67, 72, 79, 84].forEach((note, i) => playTone(note, now + i * 0.045, 0.28, i < 2 ? "sawtooth" : "square", 0.28));
        }
    }

    function setIntensity(active) {
        if (trackName !== "boss") return;
        track.bpm = active ? 208 : baseBpm;
        if (master) master.gain.setTargetAtTime(active ? 0.18 : 0.15, audioContext.currentTime, 0.08);
    }

    function runScheduler() {
        if (!audioContext) return;
        const stepLength = 60 / track.bpm / 2;
        while (nextNoteTime < audioContext.currentTime + 0.16) {
            scheduleStep(nextNoteTime);
            nextNoteTime += stepLength;
            step++;
        }
    }

    async function startMusic() {
        if (muted) return;
        if (!audioContext) {
            audioContext = new AudioContextClass();
            master = audioContext.createGain();
            const filter = audioContext.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.value = 2400;
            master.gain.value = trackName === "boss" ? 0.15 : 0.13;
            master.connect(filter).connect(audioContext.destination);
            nextNoteTime = audioContext.currentTime + 0.05;
        }
        if (audioContext.state === "suspended") await audioContext.resume();
        if (!scheduler) scheduler = window.setInterval(runScheduler, 40);
        started = true;
    }

    function stopMusic() {
        if (audioContext && audioContext.state === "running") audioContext.suspend();
        if (scheduler) window.clearInterval(scheduler);
        scheduler = 0;
    }

    button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        muted = !muted;
        try { localStorage.setItem("megumi-bgm-muted", muted ? "1" : "0"); } catch (_) {}
        refreshButton();
        if (muted) stopMusic(); else startMusic();
    });

    const unlock = () => {
        if (!muted && !started) startMusic();
    };
    document.addEventListener("pointerdown", unlock, { capture: true, once: true });
    document.addEventListener("keydown", unlock, { capture: true, once: true });
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) stopMusic();
        else if (!muted && started) startMusic();
    });

    refreshButton();
    document.body.appendChild(button);
    window.GameAudio = { play: playEffect, setIntensity };
})();
