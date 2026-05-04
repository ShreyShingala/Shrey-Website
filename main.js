// ============================================
// Theme Toggle (The One Ring)
// ============================================

const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

// Check for saved theme; default to dark
const savedTheme = localStorage.getItem('theme');

if (savedTheme) {
    body.classList.toggle('dark', savedTheme === 'dark');
} else {
    body.classList.add('dark');
}

// ============================================
// Cinematic Theme Transition
// ============================================
let isTransitioning = false;
// Forced cinematic blink state declarations (defined early so handlers can use them)
let forcedBlinkTarget = null; // null = normal, 0 = force open, 1 = force close
let forcedBlinkFrom = 0;
let forcedBlinkDuration = 0;
let forcedBlinkStart = 0;
let forcedBlinkCallback = null;

// Expose clearForcedBlink globally so top-level handlers (theme toggle, clicks)
// can cancel forced cinematic blink state. This intentionally operates on the
// shared `forcedBlink*` variables declared above.
function clearForcedBlink() {
    forcedBlinkTarget = null;
    forcedBlinkFrom = 0;
    forcedBlinkDuration = 0;
    forcedBlinkStart = 0;
    forcedBlinkCallback = null;
}

let transitionTarget = null; // 'dark' | 'light' | null
let transitionSafetyTimer = null;
let transitionOverlayFadeTimer = null;

themeToggle?.addEventListener('click', () => {
    // overlay element removed; keep variable for compatibility if needed
    const overlay = null;

    const currentlyDark = body.classList.contains('dark');
    const requestedGoingDark = !currentlyDark;

    // If a transition is already running and user clicks, reverse it.
    if (isTransitioning) {
        const currentTargetIsDark = transitionTarget === 'dark';
        // If the user clicked to request the same direction, ignore.
        if (currentTargetIsDark === requestedGoingDark) return;

        // Clear any safety timer and pending overlay fades from the in-progress transition
        if (transitionSafetyTimer) { clearTimeout(transitionSafetyTimer); transitionSafetyTimer = null; }
        if (transitionOverlayFadeTimer) { clearTimeout(transitionOverlayFadeTimer); transitionOverlayFadeTimer = null; }

        // Clear any forced blink state to allow the new cinematic to run cleanly
        clearForcedBlink();

        // Fall through to start the opposite transition below
    } else {
        isTransitioning = true;
    }

    // Mark what we're targeting now
    transitionTarget = requestedGoingDark ? 'dark' : 'light';

    if (requestedGoingDark) {
        // Going dark: apply class, then eye opens from closed
        body.classList.add('dark');
        localStorage.setItem('theme', 'dark');

        // Ensure any previous forced transitions are cleared, then force eye open
        clearForcedBlink();
        if (window._sauronForceEyeOpen) {
            window._sauronForceEyeOpen(800);
        }

        // Complete transition after cinematic delay
        transitionOverlayFadeTimer = setTimeout(() => {
            isTransitioning = false;
            transitionTarget = null;
            transitionOverlayFadeTimer = null;
        }, 1000);

    } else {
        // Going light: eye closes, flash, then remove dark
        // Safety: always unlock after max 2 seconds no matter what
        transitionSafetyTimer = setTimeout(() => {
            body.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            isTransitioning = false;
            transitionTarget = null;
            transitionSafetyTimer = null;
        }, 2000);

        const finishLight = () => {
            // Flash light overlay (overlay removed) — no-op
            // Remove dark mode
            body.classList.remove('dark');
            localStorage.setItem('theme', 'light');

            // Fade out overlay
            transitionOverlayFadeTimer = setTimeout(() => {
                if (transitionSafetyTimer) { clearTimeout(transitionSafetyTimer); transitionSafetyTimer = null; }
                isTransitioning = false;
                transitionTarget = null;
                transitionOverlayFadeTimer = null;
            }, 500);
        };

        clearForcedBlink();
        if (window._sauronForceEyeClose) {
            window._sauronForceEyeClose(400, finishLight);
        } else {
            finishLight();
        }
    }
});

// ============================================
// "My Precious" Easter Egg
// ============================================
let preciousClicks = [];
let preciousCooldown = false;

themeToggle?.addEventListener('click', () => {
    if (preciousCooldown) return;

    const now = Date.now();
    preciousClicks.push(now);
    preciousClicks = preciousClicks.filter(t => now - t < 1000);

    if (preciousClicks.length >= 3) {
        preciousClicks = [];
        preciousCooldown = true;

        const pOverlay = document.getElementById('precious-overlay');
        const toggle = document.getElementById('theme-toggle');
        if (pOverlay) pOverlay.classList.add('active');
        if (toggle) {
            toggle.classList.add('precious-active');
            // Add flip for precious too
            toggle.classList.remove('flipping');
            void toggle.offsetWidth;
            toggle.classList.add('flipping');
        }

        setTimeout(() => {
            if (pOverlay) pOverlay.classList.remove('active');
            if (toggle) toggle.classList.remove('precious-active');
            preciousCooldown = false;
        }, 2500);
    }
});
        (function sauronEngine() {
            const canvas = document.getElementById('sauron-canvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');

            // ---- State ----
            let W = 0, H = 0;
            let mouse = { x: -9999, y: -9999 };
            
            let cursorPresent = false;
            let hasSeenCursor = false;
            let smoothMouse = { x: -9999, y: -9999 };
            let particles = [];
            let embers = [];
            let blinkProgress = 0;
            let isBlinking = false;
            let dpr = 1;
            // Track recent document clicks to detect rapid triple-clicks
            // (used by the emergency blink reset handler)
            let docClickTimes = [];
            let lastBlinkProgressChange = performance.now();
            let prevBlinkProgress = blinkProgress;

            // Lightning state
            let lightningActive = false;
            let lightningStartTime = 0;
            let lightningBolts = [];

            // ---- Config ----
            const TOWER_RIGHT_MARGIN = 60;   // px from right edge
            const TOWER_WIDTH = 90;          // px
            const EYE_Y_RATIO = 0.18;       // how far down the viewport the eye sits

            // ---- Resize ----
            function resize() {
                dpr = window.devicePixelRatio || 1;
                W = window.innerWidth;
                H = window.innerHeight;
                canvas.width = W * dpr;
                canvas.height = H * dpr;
                canvas.style.width = W + 'px';
                canvas.style.height = H + 'px';
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            }
            window.addEventListener('resize', resize);
            resize();

    // ---- Mouse ----
    document.addEventListener('mousemove', e => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        cursorPresent = true;
        hasSeenCursor = true;
    });
    document.addEventListener('mouseenter', () => {
        cursorPresent = true;
    });
    document.addEventListener('mouseleave', () => {
        cursorPresent = false;
    });

    // ---- Eye position ----
    function getEyePos() {
        return {
            x: W - TOWER_RIGHT_MARGIN - TOWER_WIDTH / 2,
            y: H * EYE_Y_RATIO
        };
    }

    // ================================================================
    //  TOWER OF BARAD-DÛR — multi-tiered dark fortress
    // ================================================================
    function drawTower(ex, ey) {
        const towerTop = ey + 55;   // lower below the eye so prongs are visible
        const towerBot = H + 10;    // past viewport
        const totalH = towerBot - towerTop;

        ctx.save();

        // --- Helper: width at a given fraction (0=top, 1=bottom) ---
        // Multi-tiered profile: narrow waist, wider base, with setbacks
        function profileW(t) {
            // Narrow crown at top, slight bulge, waist, then expanding base
            if (t < 0.06) return 20 + t / 0.06 * 5;                     // crown neck
            if (t < 0.15) return 25 + (t - 0.06) / 0.09 * 5;           // upper shaft
            if (t < 0.18) return 30;                                      // first setback
            if (t < 0.30) return 21 + (t - 0.18) / 0.12 * 8;           // mid-upper
            if (t < 0.33) return 29;                                      // second setback
            if (t < 0.50) return 29 + (t - 0.33) / 0.17 * 10;          // mid tower
            if (t < 0.53) return 39;                                      // third setback
            if (t < 0.70) return 39 + (t - 0.53) / 0.17 * 9;           // lower tower
            if (t < 0.73) return 48;                                      // fourth setback
            return 48 + (t - 0.73) / 0.27 * 22;                          // fortress base
        }

        // --- Main tower body (built from stacked slices for curved profile) ---
        const slices = 80;
        const sliceH = totalH / slices;

        for (let i = 0; i < slices; i++) {
            const t = i / slices;
            const y = towerTop + t * totalH;
            const w = profileW(t);
            const nextW = profileW((i + 1) / slices);

            // Horizontal gradient for 3D roundedness
            const tGrad = ctx.createLinearGradient(ex - w, 0, ex + w, 0);
            const base = Math.floor(10 + t * 6); // slightly lighter toward base
            tGrad.addColorStop(0,   `rgb(${base - 6}, ${base - 7}, ${base - 8})`);
            tGrad.addColorStop(0.25, `rgb(${base + 4}, ${base + 2}, ${base})`);
            tGrad.addColorStop(0.45, `rgb(${base + 10}, ${base + 7}, ${base + 4})`);
            tGrad.addColorStop(0.55, `rgb(${base + 10}, ${base + 7}, ${base + 4})`);
            tGrad.addColorStop(0.75, `rgb(${base + 4}, ${base + 2}, ${base})`);
            tGrad.addColorStop(1,   `rgb(${base - 6}, ${base - 7}, ${base - 8})`);

            ctx.fillStyle = tGrad;
            ctx.beginPath();
            ctx.moveTo(ex - w, y);
            ctx.lineTo(ex + w, y);
            ctx.lineTo(ex + nextW, y + sliceH + 0.5);
            ctx.lineTo(ex - nextW, y + sliceH + 0.5);
            ctx.closePath();
            ctx.fill();
        }

        // --- Setback ledges (protruding stone bands) ---
        const setbacks = [0.06, 0.15, 0.18, 0.30, 0.33, 0.50, 0.53, 0.70, 0.73];
        for (const sb of setbacks) {
            const y = towerTop + sb * totalH;
            const w = profileW(sb) + 4;
            ctx.fillStyle = '#0e0c09';
            ctx.fillRect(ex - w, y - 1.5, w * 2, 3);
            // Slight highlight on top edge
            ctx.fillStyle = 'rgba(35, 28, 18, 0.6)';
            ctx.fillRect(ex - w, y - 1.5, w * 2, 1);
        }

        // --- Buttresses / ribs running up the tower ---
        ctx.strokeStyle = 'rgba(22, 18, 12, 0.5)';
        ctx.lineWidth = 1.5;
        for (let side = -1; side <= 1; side += 2) {
            // Main rib
            ctx.beginPath();
            for (let i = 0; i <= slices; i++) {
                const t = i / slices;
                const y = towerTop + t * totalH;
                const w = profileW(t) * 0.35;
                const x = ex + side * w;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Outer rib
            ctx.strokeStyle = 'rgba(18, 14, 10, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 0; i <= slices; i++) {
                const t = i / slices;
                const y = towerTop + t * totalH;
                const w = profileW(t) * 0.7;
                const x = ex + side * w;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // --- Two main prongs that hold the eye ---
        // Rise from tower top, flare outward, tips end at the sides of the eye
        for (let side = -1; side <= 1; side += 2) {
            const baseInnerX = ex + side * 10;
            const baseOuterX = ex + side * 20;
            const baseY = towerTop;

            // Tips end at the eye's sides (eyeW = 70 in drawEye)
            const tipX = ex + side * 78;
            const tipY = ey;  // right at eye level

            // Prong gradient
            const pGrad = ctx.createLinearGradient(
                ex, baseY, ex + side * 80, ey
            );
            pGrad.addColorStop(0, '#0e0c08');
            pGrad.addColorStop(0.3, '#161310');
            pGrad.addColorStop(0.6, '#100e0a');
            pGrad.addColorStop(1, '#080604');

            // Outer edge curves outward from base to tip at eye side
            // Inner edge is a tighter curve from base to tip
            ctx.fillStyle = pGrad;
            ctx.beginPath();
            // Outer edge — sweeps wide, arrives at eye side
            ctx.moveTo(baseOuterX, baseY);
            ctx.bezierCurveTo(
                ex + side * 40, baseY - 10,     // starts curving out
                ex + side * 75, ey + 40,         // wide arc below eye
                tipX + side * 4, tipY + 4        // tip outer (just past eye edge)
            );
            // Pointed tip at the eye's side
            ctx.lineTo(tipX, tipY - 2);
            // Inner edge — tighter curve back to base
            ctx.bezierCurveTo(
                ex + side * 60, ey + 30,         // inner arc below eye
                ex + side * 25, baseY - 5,
                baseInnerX, baseY
            );
            ctx.closePath();
            ctx.fill();

            // Highlight on inner face
            ctx.strokeStyle = 'rgba(50, 38, 22, 0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(baseInnerX + side * 2, baseY);
            ctx.bezierCurveTo(
                ex + side * 27, baseY - 4,
                ex + side * 62, ey + 28,
                tipX, tipY - 1
            );
            ctx.stroke();

            // Dark edge on outer face
            ctx.strokeStyle = 'rgba(3, 2, 0, 0.5)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(baseOuterX, baseY);
            ctx.bezierCurveTo(
                ex + side * 40, baseY - 10,
                ex + side * 75, ey + 40,
                tipX + side * 4, tipY + 4
            );
            ctx.stroke();

            // Faint fire glow on inner face (lit by the eye)
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const glowGrad = ctx.createRadialGradient(ex, ey, 10, ex, ey, 80);
            glowGrad.addColorStop(0, 'rgba(255, 80, 0, 0.04)');
            glowGrad.addColorStop(0.5, 'rgba(200, 50, 0, 0.02)');
            glowGrad.addColorStop(1, 'rgba(100, 20, 0, 0)');
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.moveTo(baseInnerX, baseY);
            ctx.bezierCurveTo(
                ex + side * 27, baseY - 4,
                ex + side * 62, ey + 28,
                tipX, tipY - 1
            );
            ctx.bezierCurveTo(
                ex + side * 65, ey + 30,
                ex + side * 30, baseY - 3,
                baseInnerX + side * 5, baseY
            );
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // --- Secondary shorter prong ---
            ctx.fillStyle = '#0b0906';
            ctx.beginPath();
            ctx.moveTo(ex + side * 6, baseY);
            ctx.bezierCurveTo(
                ex + side * 20, baseY - 5,
                ex + side * 48, ey + 30,
                ex + side * 58, ey + 8
            );
            ctx.lineTo(ex + side * 54, ey + 6);
            ctx.bezierCurveTo(
                ex + side * 42, ey + 26,
                ex + side * 16, baseY - 3,
                ex + side * 2, baseY
            );
            ctx.closePath();
            ctx.fill();

            // --- Jagged teeth along the crown rim ---
            const teeth = [
                { bx: 4, tipOff: 6, h: 14 },
                { bx: 10, tipOff: 13, h: 20 },
                { bx: 18, tipOff: 22, h: 11 },
                { bx: 26, tipOff: 30, h: 16 },
            ];
            ctx.fillStyle = '#0a0806';
            for (const tooth of teeth) {
                const tbx = ex + side * tooth.bx;
                const ttx = ex + side * tooth.tipOff;
                ctx.beginPath();
                ctx.moveTo(tbx - side * 2.5, towerTop);
                ctx.lineTo(ttx, towerTop - tooth.h);
                ctx.lineTo(tbx + side * 2.5, towerTop);
                ctx.closePath();
                ctx.fill();
            }
        }

        // --- Central spire (short, just above crown) ---
        ctx.fillStyle = '#0a0806';
        ctx.beginPath();
        ctx.moveTo(ex - 3, towerTop - 5);
        ctx.lineTo(ex, towerTop - 35);
        ctx.lineTo(ex + 3, towerTop - 5);
        ctx.closePath();
        ctx.fill();

        // Flanking spires
        for (let side = -1; side <= 1; side += 2) {
            ctx.fillStyle = '#080604';
            ctx.beginPath();
            ctx.moveTo(ex + side * 5 - 1.5, towerTop - 2);
            ctx.lineTo(ex + side * 7, towerTop - 24);
            ctx.lineTo(ex + side * 5 + 1.5, towerTop - 2);
            ctx.closePath();
            ctx.fill();
        }

        // --- Spikes along the tower body ---
        const bodySpikes = [
            { t: 0.10, side:  1, h: 18, w: 4 },
            { t: 0.14, side: -1, h: 14, w: 3 },
            { t: 0.22, side:  1, h: 12, w: 3 },
            { t: 0.27, side: -1, h: 16, w: 4 },
            { t: 0.36, side:  1, h: 20, w: 5 },
            { t: 0.42, side: -1, h: 13, w: 3 },
            { t: 0.48, side:  1, h: 15, w: 4 },
            { t: 0.58, side: -1, h: 18, w: 4 },
            { t: 0.64, side:  1, h: 12, w: 3 },
            { t: 0.72, side: -1, h: 16, w: 4 },
            { t: 0.78, side:  1, h: 22, w: 5 },
            { t: 0.85, side: -1, h: 14, w: 3 },
        ];
        ctx.fillStyle = '#0c0a07';
        for (const sp of bodySpikes) {
            const sy = towerTop + sp.t * totalH;
            const sw = profileW(sp.t);
            const sBaseX = ex + sp.side * sw;
            ctx.beginPath();
            ctx.moveTo(sBaseX, sy + sp.w);
            ctx.lineTo(sBaseX + sp.side * sp.h, sy - 2);
            ctx.lineTo(sBaseX, sy - sp.w);
            ctx.closePath();
            ctx.fill();
        }

        // --- Flying buttresses at lower section ---
        for (let side = -1; side <= 1; side += 2) {
            for (let b = 0; b < 3; b++) {
                const t = 0.55 + b * 0.12;
                const y = towerTop + t * totalH;
                const w = profileW(t);
                const buttEndX = ex + side * (w + 15 + b * 8);
                const buttEndY = y + 30 + b * 15;

                ctx.fillStyle = '#0c0a07';
                ctx.beginPath();
                ctx.moveTo(ex + side * w, y);
                ctx.quadraticCurveTo(
                    ex + side * (w + 8 + b * 4), y + 5,
                    buttEndX, buttEndY
                );
                ctx.lineTo(buttEndX - side * 3, buttEndY + 4);
                ctx.quadraticCurveTo(
                    ex + side * (w + 5 + b * 3), y + 10,
                    ex + side * w, y + 6
                );
                ctx.closePath();
                ctx.fill();
            }
        }

        // --- Stone block texture (subtle horizontal lines) ---
        ctx.strokeStyle = 'rgba(25, 20, 14, 0.25)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < slices; i += 2) {
            const t = i / slices;
            const y = towerTop + t * totalH;
            const w = profileW(t);
            ctx.beginPath();
            ctx.moveTo(ex - w, y);
            ctx.lineTo(ex + w, y);
            ctx.stroke();
        }

        // --- Window slits with faint fire glow ---
        const windowTiers = [0.20, 0.28, 0.38, 0.45, 0.56, 0.63, 0.75, 0.82];
        for (let i = 0; i < windowTiers.length; i++) {
            const t = windowTiers[i];
            const y = towerTop + t * totalH;
            const w = profileW(t);
            // Fire glow behind slit
            ctx.fillStyle = 'rgba(180, 60, 0, 0.15)';
            ctx.fillRect(ex - w * 0.2 - 2, y - 1, 5, 10);
            ctx.fillRect(ex + w * 0.15 - 1, y + 8, 5, 10);
            // Dark slit
            ctx.fillStyle = 'rgba(5, 3, 0, 0.8)';
            ctx.fillRect(ex - w * 0.2, y, 2, 8);
            ctx.fillRect(ex + w * 0.15, y + 9, 2, 8);
        }

        // --- Faint ember glow at tower base ---
        const baseGlow = ctx.createRadialGradient(ex, towerBot - 60, 10, ex, towerBot - 60, profileW(1) * 1.5);
        baseGlow.addColorStop(0, 'rgba(120, 30, 0, 0.06)');
        baseGlow.addColorStop(1, 'rgba(60, 10, 0, 0)');
        ctx.fillStyle = baseGlow;
        ctx.beginPath();
        ctx.ellipse(ex, towerBot - 60, profileW(1) * 1.5, 80, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ================================================================
    //  FIRE PARTICLES
    // ================================================================
    class FireParticle {
        constructor(x, y, isEmber) {
            this.isEmber = isEmber;
            if (isEmber) {
                this.x = x + (Math.random() - 0.5) * 80;
                this.y = y + (Math.random() - 0.5) * 40;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = -(Math.random() * 1.5 + 0.3);
                this.life = 1;
                this.decay = Math.random() * 0.008 + 0.004;
                this.size = Math.random() * 2 + 0.5;
            } else {
                this.x = x + (Math.random() - 0.5) * 50;
                this.y = y + (Math.random() - 0.5) * 18;
                this.vx = (Math.random() - 0.5) * 1.5;
                this.vy = -(Math.random() * 3 + 1.5);
                this.life = 1;
                this.decay = Math.random() * 0.02 + 0.012;
                this.size = Math.random() * 5 + 2;
            }
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.vx += (Math.random() - 0.5) * 0.2;
            this.vy -= 0.03;
            this.life -= this.decay;
            if (!this.isEmber) this.size *= 0.997;
        }
        draw(ctx) {
            if (this.life <= 0) return;
            const a = this.life;
            if (this.isEmber) {
                // Tiny bright spark
                ctx.fillStyle = `rgba(255, ${180 + a * 75 | 0}, ${50 + a * 100 | 0}, ${a * 0.9})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Bigger flame blob
                const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
                if (a > 0.6) {
                    g.addColorStop(0, `rgba(255, 230, 120, ${a * 0.7})`);
                    g.addColorStop(0.4, `rgba(255, 160, 20, ${a * 0.5})`);
                    g.addColorStop(1, `rgba(200, 60, 0, 0)`);
                } else {
                    g.addColorStop(0, `rgba(255, 120, 10, ${a * 0.6})`);
                    g.addColorStop(0.5, `rgba(180, 40, 0, ${a * 0.3})`);
                    g.addColorStop(1, `rgba(80, 10, 0, 0)`);
                }
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // ================================================================
    //  THE EYE — Fiery slit-pupil Sauron eye
    // ================================================================
    function drawEye(cx, cy, time) {
        // Clamp openness to valid [0,1] range to avoid negative radii
        let openness = 1 - blinkProgress;
        openness = Math.max(0, Math.min(1, openness));
        if (openness < 0.02) return;

        // Eye dimensions
        const eyeW = 70;
        const eyeH = Math.max(0, 30 * openness);

        // Track cursor
        const dx = mouse.x - cx;
        const dy = mouse.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const maxShift = 14;
        const trackRatio = Math.min(dist, 500) / 500;
        const shiftX = (dx / dist) * maxShift * trackRatio;
        const shiftY = (dy / dist) * maxShift * trackRatio * 0.35;
        const pupilCX = cx + shiftX;
        const pupilCY = cy + shiftY;

        ctx.save();

        // --------------- MASSIVE AMBIENT GLOW ---------------
        // This lights up the background around the eye
        const ambientR = 220;
        const ambPulse = 1 + Math.sin(time * 0.002) * 0.08;
        const ambGlow = ctx.createRadialGradient(cx, cy, 10, cx, cy, ambientR * ambPulse);
        ambGlow.addColorStop(0, `rgba(255, 100, 0, ${0.5 * openness})`);
        ambGlow.addColorStop(0.3, `rgba(220, 60, 0, ${0.25 * openness})`);
        ambGlow.addColorStop(0.6, `rgba(120, 20, 0, ${0.1 * openness})`);
        ambGlow.addColorStop(1, 'rgba(40, 5, 0, 0)');
        ctx.fillStyle = ambGlow;
        ctx.beginPath();
        ctx.ellipse(cx, cy, ambientR * ambPulse, ambientR * 0.7 * openness * ambPulse, 0, 0, Math.PI * 2);
        ctx.fill();

        // --------------- EYE SHAPE ---------------
        // Almond / cat-eye shape
        ctx.beginPath();
        ctx.moveTo(cx - eyeW, cy);
        ctx.bezierCurveTo(cx - eyeW * 0.5, cy - eyeH * 1.4, cx + eyeW * 0.5, cy - eyeH * 1.4, cx + eyeW, cy);
        ctx.bezierCurveTo(cx + eyeW * 0.5, cy + eyeH * 1.4, cx - eyeW * 0.5, cy + eyeH * 1.4, cx - eyeW, cy);
        ctx.closePath();
        ctx.save();
        ctx.clip();

        // --------------- IRIS FIRE FILL ---------------
        // Base fiery gradient
        const irisGrad = ctx.createRadialGradient(pupilCX, pupilCY, 0, pupilCX, pupilCY, eyeW * 0.9);
        irisGrad.addColorStop(0, '#ffcc33');
        irisGrad.addColorStop(0.15, '#ff8800');
        irisGrad.addColorStop(0.35, '#ee4400');
        irisGrad.addColorStop(0.6, '#aa1100');
        irisGrad.addColorStop(1, '#330500');
        ctx.fillStyle = irisGrad;
        ctx.fillRect(cx - eyeW - 5, cy - eyeH * 1.5, eyeW * 2 + 10, eyeH * 3 + 10);

        // Animated swirling fire veins
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 10; i++) {
            const ang = time * 0.0008 + (i * Math.PI * 2) / 10;
            const r1 = 18 + Math.sin(time * 0.0015 + i * 1.3) * 12;
            const fx = pupilCX + Math.cos(ang) * r1;
            const fy = pupilCY + Math.sin(ang) * r1 * 0.45;
            const fSize = 10 + Math.sin(time * 0.003 + i * 2) * 4;
            const fGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, fSize);
            const fAlpha = 0.15 + Math.sin(time * 0.002 + i) * 0.08;
            fGrad.addColorStop(0, `rgba(255, 200, 50, ${fAlpha})`);
            fGrad.addColorStop(0.5, `rgba(255, 100, 0, ${fAlpha * 0.4})`);
            fGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');
            ctx.fillStyle = fGrad;
            ctx.beginPath();
            ctx.ellipse(fx, fy, fSize, fSize * 0.6, ang * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Pulsing concentric rings
        for (let r = 0; r < 3; r++) {
            const ringR = 12 + r * 14 + Math.sin(time * 0.003 + r) * 3;
            ctx.strokeStyle = `rgba(255, 140, 0, ${0.08 - r * 0.02})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(pupilCX, pupilCY, ringR, ringR * 0.45, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.globalCompositeOperation = 'source-over';

        // --------------- SLIT PUPIL ---------------
        const slitW = 4 + Math.sin(time * 0.003) * 0.8;
        // Compute raw slit height then clamp to a small positive value to avoid
        // negative minor-axis radii when openness is very small and the
        // sine term swings negative.
        const slitHRaw = (eyeH * 1.6 + Math.sin(time * 0.002) * 3) * openness;
        const slitH = Math.max(0.5, slitHRaw);

        // Pupil dark core
        ctx.fillStyle = '#050000';
        ctx.beginPath();
        ctx.ellipse(pupilCX, pupilCY, slitW, slitH, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pupil edge glow
        const pupEdge = ctx.createRadialGradient(pupilCX, pupilCY, slitW * 0.5, pupilCX, pupilCY, slitW + 5);
        pupEdge.addColorStop(0, 'rgba(255, 80, 0, 0)');
        pupEdge.addColorStop(0.5, 'rgba(255, 80, 0, 0.35)');
        pupEdge.addColorStop(1, 'rgba(255, 40, 0, 0)');
        ctx.fillStyle = pupEdge;
        ctx.beginPath();
        ctx.ellipse(pupilCX, pupilCY, slitW + 5, slitH + 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore(); // un-clip

        // --------------- EYE OUTLINE ---------------
        ctx.strokeStyle = `rgba(255, 140, 20, ${0.7 * openness})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 20 * openness;
        ctx.beginPath();
        ctx.moveTo(cx - eyeW, cy);
        ctx.bezierCurveTo(cx - eyeW * 0.5, cy - eyeH * 1.4, cx + eyeW * 0.5, cy - eyeH * 1.4, cx + eyeW, cy);
        ctx.bezierCurveTo(cx + eyeW * 0.5, cy + eyeH * 1.4, cx - eyeW * 0.5, cy + eyeH * 1.4, cx - eyeW, cy);
        ctx.closePath();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Second inner glow outline
        ctx.strokeStyle = `rgba(255, 200, 60, ${0.3 * openness})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - eyeW + 3, cy);
        ctx.bezierCurveTo(cx - eyeW * 0.5, cy - eyeH * 1.2, cx + eyeW * 0.5, cy - eyeH * 1.2, cx + eyeW - 3, cy);
        ctx.bezierCurveTo(cx + eyeW * 0.5, cy + eyeH * 1.2, cx - eyeW * 0.5, cy + eyeH * 1.2, cx - eyeW + 3, cy);
        ctx.closePath();
        ctx.stroke();

        // --------------- CORNER FLAME TENDRILS ---------------
        ctx.globalCompositeOperation = 'lighter';
        for (let side = -1; side <= 1; side += 2) {
            const tipX = cx + side * eyeW;
            const tipY = cy;
            for (let t = 0; t < 3; t++) {
                const ang = side * (0.3 + t * 0.15) + Math.sin(time * 0.003 + t) * 0.2;
                const len = 20 + Math.sin(time * 0.004 + t * 2) * 8;
                const endX = tipX + Math.cos(ang) * len * side;
                const endY = tipY + Math.sin(ang) * len * 0.5;
                const tGrad = ctx.createLinearGradient(tipX, tipY, endX, endY);
                tGrad.addColorStop(0, `rgba(255, 120, 0, ${0.4 * openness})`);
                tGrad.addColorStop(1, 'rgba(255, 60, 0, 0)');
                ctx.strokeStyle = tGrad;
                ctx.lineWidth = 2.5 - t * 0.5;
                ctx.beginPath();
                ctx.moveTo(tipX, tipY);
                ctx.quadraticCurveTo(
                    tipX + side * len * 0.5,
                    tipY + Math.sin(time * 0.005 + t) * 10,
                    endX, endY
                );
                ctx.stroke();
            }
        }
        ctx.globalCompositeOperation = 'source-over';

        ctx.restore();
    }

    // ================================================================
    //  BEAM — from eye to cursor
    // ================================================================
    function drawBeam(eyeX, eyeY, time) {
        if (!hasSeenCursor) return;
        const dx = mouse.x - eyeX;
        const dy = mouse.y - eyeY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 50) return;

        let openness = 1 - blinkProgress;
        openness = Math.max(0, Math.min(1, openness));
        if (openness < 0.1) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const dirX = dx / dist;
        const dirY = dy / dist;
        const perpX = -dirY;
        const perpY = dirX;

        // Flickering intensity
        const flick = 0.05 + Math.sin(time * 0.005) * 0.02 + Math.sin(time * 0.013) * 0.012;
        const alpha = flick * openness;

        // Wide soft body of the beam
        const glowWStart = 18 * openness;
        const glowWEnd = 10;
        const glowGrad = ctx.createLinearGradient(eyeX, eyeY, smoothMouse.x, smoothMouse.y);
        glowGrad.addColorStop(0, `rgba(255, 120, 25, ${alpha * 0.24})`);
        glowGrad.addColorStop(0.45, `rgba(255, 80, 15, ${alpha * 0.14})`);
        glowGrad.addColorStop(1, 'rgba(255, 60, 12, 0)');

        ctx.beginPath();
        ctx.moveTo(eyeX + perpX * glowWStart, eyeY + perpY * glowWStart);
        ctx.lineTo(smoothMouse.x + perpX * glowWEnd, smoothMouse.y + perpY * glowWEnd);
        ctx.lineTo(smoothMouse.x - perpX * glowWEnd, smoothMouse.y - perpY * glowWEnd);
        ctx.lineTo(eyeX - perpX * glowWStart, eyeY - perpY * glowWStart);
        ctx.closePath();
        ctx.fillStyle = glowGrad;
        ctx.fill();

        // Circular beam formation: multiple thin slices wrapped around the axis.
        // This avoids a single hard center line and reads more volumetric.
        const sliceCount = 10;
        for (let i = 0; i < sliceCount; i++) {
            const phase = (i / sliceCount) * Math.PI * 2 + time * 0.0012;
            const ringEye = (5.5 + Math.sin(time * 0.0017 + i * 1.3) * 2.2) * openness;
            const ringTip = 2.6 + Math.sin(time * 0.002 + i * 0.9) * 0.75;
            const axialSkew = Math.sin(phase) * ringEye * 0.22;

            const offsetEyeX = perpX * Math.cos(phase) * ringEye + dirX * axialSkew;
            const offsetEyeY = perpY * Math.cos(phase) * ringEye + dirY * axialSkew;
            const offsetTipX = perpX * Math.cos(phase) * ringTip + dirX * axialSkew * 0.35;
            const offsetTipY = perpY * Math.cos(phase) * ringTip + dirY * axialSkew * 0.35;

            const startX = eyeX + offsetEyeX;
            const startY = eyeY + offsetEyeY;
            const endX = smoothMouse.x + offsetTipX;
            const endY = smoothMouse.y + offsetTipY;

            const wobble = Math.sin(time * 0.003 + i * 1.7) * 6;
            const ctrlX = (startX + endX) * 0.5 + perpX * wobble;
            const ctrlY = (startY + endY) * 0.5 + perpY * wobble;

            const sliceGrad = ctx.createLinearGradient(startX, startY, endX, endY);
            sliceGrad.addColorStop(0, `rgba(255, 165, 55, ${alpha * 0.22})`);
            sliceGrad.addColorStop(0.35, `rgba(255, 105, 20, ${alpha * 0.14})`);
            sliceGrad.addColorStop(1, 'rgba(255, 70, 15, 0)');
            ctx.strokeStyle = sliceGrad;
            ctx.lineWidth = 1.4 + Math.sin(time * 0.0022 + i) * 0.45;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
            ctx.stroke();
        }

        // Soft center pass to keep beam cohesion without recreating a harsh line.
        const centerGrad = ctx.createLinearGradient(eyeX, eyeY, smoothMouse.x, smoothMouse.y);
        centerGrad.addColorStop(0, `rgba(255, 180, 70, ${alpha * 0.18})`);
        centerGrad.addColorStop(0.5, `rgba(255, 120, 35, ${alpha * 0.09})`);
        centerGrad.addColorStop(1, 'rgba(255, 80, 20, 0)');
        ctx.strokeStyle = centerGrad;
        ctx.lineWidth = 3.2 * openness;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(eyeX, eyeY);
        ctx.lineTo(smoothMouse.x, smoothMouse.y);
        ctx.stroke();

        ctx.restore();
    }

    // ================================================================
    //  CURSOR GLOW — warm fuzzy circle that ebbs and flows
    // ================================================================
    function drawCursorGlow(time) {
        if (!cursorPresent) return;
        let openness = 1 - blinkProgress;
        openness = Math.max(0, Math.min(1, openness));
        if (openness < 0.1) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Organic pulsing — larger base, more dramatic ebb/flow
        const baseR = 110;
        const pulse = baseR + Math.sin(time * 0.002) * 25 + Math.sin(time * 0.005) * 12 + Math.cos(time * 0.0033) * 8;
        const intensity = (0.16 + Math.sin(time * 0.003) * 0.06) * openness;

        // Wide ambient warmth (very large, subtle)
        const ambient = ctx.createRadialGradient(smoothMouse.x, smoothMouse.y, 0, smoothMouse.x, smoothMouse.y, pulse * 1.6);
        ambient.addColorStop(0, `rgba(255, 130, 40, ${intensity * 0.35})`);
        ambient.addColorStop(0.3, `rgba(200, 80, 15, ${intensity * 0.15})`);
        ambient.addColorStop(0.6, `rgba(120, 40, 5, ${intensity * 0.06})`);
        ambient.addColorStop(1, 'rgba(60, 15, 0, 0)');
        ctx.fillStyle = ambient;
        ctx.beginPath();
        ctx.arc(smoothMouse.x, smoothMouse.y, pulse * 1.6, 0, Math.PI * 2);
        ctx.fill();

        // Main glow ring
        const glow = ctx.createRadialGradient(smoothMouse.x, smoothMouse.y, 0, smoothMouse.x, smoothMouse.y, pulse);
        glow.addColorStop(0, `rgba(255, 170, 70, ${intensity * 1.1})`);
        glow.addColorStop(0.2, `rgba(255, 130, 40, ${intensity * 0.75})`);
        glow.addColorStop(0.45, `rgba(230, 90, 15, ${intensity * 0.35})`);
        glow.addColorStop(0.7, `rgba(180, 50, 5, ${intensity * 0.12})`);
        glow.addColorStop(1, 'rgba(100, 25, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(smoothMouse.x, smoothMouse.y, pulse, 0, Math.PI * 2);
        ctx.fill();

        // Hot center core
        const coreR = pulse * 0.28;
        const core = ctx.createRadialGradient(smoothMouse.x, smoothMouse.y, 0, smoothMouse.x, smoothMouse.y, coreR);
        core.addColorStop(0, `rgba(255, 230, 160, ${intensity * 0.8})`);
        core.addColorStop(0.4, `rgba(255, 180, 80, ${intensity * 0.5})`);
        core.addColorStop(0.7, `rgba(255, 130, 30, ${intensity * 0.2})`);
        core.addColorStop(1, 'rgba(255, 100, 20, 0)');
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(smoothMouse.x, smoothMouse.y, coreR, 0, Math.PI * 2);
        ctx.fill();

        // Flickering ring detail at the edge
        const ringPulse = Math.sin(time * 0.004) * 0.5 + 0.5;
        ctx.strokeStyle = `rgba(255, 100, 10, ${0.06 * ringPulse * openness})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(smoothMouse.x, smoothMouse.y, pulse * 0.7, 0, Math.PI * 2);
        ctx.stroke();

        // Small fiery tendrils — Sauron's gaze licking outward
        const tendrilCount = 10;
        for (let i = 0; i < tendrilCount; i++) {
            // Each tendril has a slowly drifting base angle
            const baseAng = (i / tendrilCount) * Math.PI * 2;
            const drift = Math.sin(time * 0.0015 + i * 2.3) * 0.4
                        + Math.sin(time * 0.003 + i * 1.1) * 0.2;
            const ang = baseAng + drift;

            // Length varies per tendril — some short, some longer
            const lenPhase = Math.sin(time * (0.003 + i * 0.0007) + i * 1.7);
            const len = pulse * 0.15 + lenPhase * pulse * 0.15;

            // Start at the glow edge
            const startR = pulse * 0.5;
            const sx = smoothMouse.x + Math.cos(ang) * startR;
            const sy = smoothMouse.y + Math.sin(ang) * startR;
            const ex = smoothMouse.x + Math.cos(ang) * (startR + len);
            const ey = smoothMouse.y + Math.sin(ang) * (startR + len);

            // Slight curve via a wobbling control point
            const wobble = Math.sin(time * 0.004 + i * 3.3) * 12;
            const perpAng = ang + Math.PI * 0.5;
            const cpx = (sx + ex) * 0.5 + Math.cos(perpAng) * wobble;
            const cpy = (sy + ey) * 0.5 + Math.sin(perpAng) * wobble;

            // Tendril alpha flickers independently
            const flicker = 0.5 + Math.sin(time * (0.005 + i * 0.002) + i * 4.1) * 0.4;
            const tAlpha = intensity * flicker * 0.2 * openness;

            // Tapered width
            const tWidth = 1.5 + Math.sin(time * 0.003 + i) * 0.5;

            const tGrad = ctx.createLinearGradient(sx, sy, ex, ey);
            tGrad.addColorStop(0, `rgba(255, 140, 30, ${tAlpha})`);
            tGrad.addColorStop(0.5, `rgba(255, 80, 10, ${tAlpha * 0.5})`);
            tGrad.addColorStop(1, 'rgba(200, 40, 0, 0)');
            ctx.strokeStyle = tGrad;
            ctx.lineWidth = tWidth;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.quadraticCurveTo(cpx, cpy, ex, ey);
            ctx.stroke();
        }

        ctx.restore();
    }

    // ================================================================
    //  LIGHTNING — rare red flashes behind the tower
    // ================================================================
    const LIGHTNING_DURATION = 420;

    function generateBolts() {
        const eye = getEyePos();
        const bolts = [];
        const count = 1 + Math.floor(Math.random() * 3); // 1-3 bolts
        for (let b = 0; b < count; b++) {
            const segments = [];
            let x = eye.x + (Math.random() - 0.5) * 250;
            let y = 0;
            segments.push({ x, y });
            while (y < H * 0.7) {
                x += (Math.random() - 0.5) * 40;
                y += 15 + Math.random() * 25;
                segments.push({ x, y });
                // Occasional branch
                if (Math.random() > 0.85 && segments.length > 2) {
                    const branchSegs = [];
                    let bx = x, by = y;
                    const branchLen = 2 + Math.floor(Math.random() * 3);
                    for (let i = 0; i < branchLen; i++) {
                        bx += (Math.random() - 0.5) * 30 + (Math.random() > 0.5 ? 15 : -15);
                        by += 10 + Math.random() * 15;
                        branchSegs.push({ x: bx, y: by });
                    }
                    bolts.push({ segments: [{ x, y }, ...branchSegs], width: 1.8 });
                }
            }
            bolts.push({ segments, width: 2 + Math.random() * 2 });
        }
        return bolts;
    }

    function drawLightning() {
        if (!lightningActive) return;
        const elapsed = performance.now() - lightningStartTime;
        if (elapsed > LIGHTNING_DURATION) {
            lightningActive = false;
            return;
        }

        // Double-flash alpha (two spikes within the duration)
        const t = elapsed / LIGHTNING_DURATION;
        const flash1 = Math.max(0, Math.sin(t * Math.PI * 3) * (1 - t));
        const flash2 = Math.max(0, Math.sin(t * Math.PI * 5 + 1) * (1 - t) * 0.5);
        const rawAlpha = Math.min(flash1 + flash2, 1);
        const alpha = Math.min(rawAlpha * 1.2, 1);

        if (alpha < 0.02) return;

        ctx.save();

        // red/orange screen wash
        ctx.fillStyle = `rgba(120, 40, 12, ${alpha * 0.12})`;
        ctx.fillRect(0, 0, W, H);

        // Draw bolts
        ctx.globalCompositeOperation = 'lighter';
        for (const bolt of lightningBolts) {
            if (bolt.segments.length < 2) continue;

            // Glow pass
            ctx.strokeStyle = `rgba(240, 100, 40, ${alpha * 0.35})`;
            ctx.lineWidth = bolt.width + 8;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(bolt.segments[0].x, bolt.segments[0].y);
            for (let i = 1; i < bolt.segments.length; i++) {
                ctx.lineTo(bolt.segments[i].x, bolt.segments[i].y);
            }
            ctx.stroke();

            // Core pass 
            ctx.strokeStyle = `rgba(255, 180, 80, ${alpha * 0.9})`;
            ctx.lineWidth = Math.max(1, bolt.width * 1.6);
            ctx.beginPath();
            ctx.moveTo(bolt.segments[0].x, bolt.segments[0].y);
            for (let i = 1; i < bolt.segments.length; i++) {
                ctx.lineTo(bolt.segments[i].x, bolt.segments[i].y);
            }
            ctx.stroke();
        }

        ctx.restore();
    }

    // Schedule lightning every 15-45 seconds
    (function scheduleLightning() {
        setTimeout(() => {
            if (body.classList.contains('dark') && !lightningActive) {
                lightningActive = true;
                lightningStartTime = performance.now();
                lightningBolts = generateBolts();
            }
            scheduleLightning();
        }, 15000 + Math.random() * 30000);
    })();

    // ================================================================
    //  BLINK SYSTEM — driven by main render loop, not separate rAF
    // ================================================================
    let blinkStartTime = 0;
    const BLINK_CLOSE = 90, BLINK_HOLD = 70, BLINK_OPEN = 140;
    const BLINK_TOTAL = BLINK_CLOSE + BLINK_HOLD + BLINK_OPEN;

    window._sauronForceEyeOpen = function(durationMs) {
        // Mark as busy so other blinks won't interrupt this cinematic transition
        isBlinking = true;
        forcedBlinkCallback = null;
        forcedBlinkFrom = 1;
        forcedBlinkTarget = 0;
        forcedBlinkDuration = durationMs;
        forcedBlinkStart = performance.now();
        blinkProgress = 1;
    };

    window._sauronForceEyeClose = function(durationMs, callback) {
        // Mark as busy so this forced close isn't interrupted by user clicks
        isBlinking = true;
        forcedBlinkCallback = null;
        forcedBlinkFrom = blinkProgress; // start from current state
        forcedBlinkTarget = 1;
        forcedBlinkDuration = durationMs;
        forcedBlinkStart = performance.now();
        forcedBlinkCallback = callback;
    };

    function triggerBlink() {
        if (isBlinking || forcedBlinkTarget !== null) return;
        isBlinking = true;
        blinkStartTime = performance.now();
    }

    // Called every frame from render() to update blinkProgress
    function updateBlink() {
        // Sanity recover
        if (!isFinite(blinkProgress) || Number.isNaN(blinkProgress)) {
            blinkProgress = 0;
            isBlinking = false;
            clearForcedBlink();
        }

        // Forced cinematic transition
        if (forcedBlinkTarget !== null) {
            const elapsed = performance.now() - forcedBlinkStart;

            if (elapsed > 3000) {
                blinkProgress = 0;
                isBlinking = false;
                const cb = forcedBlinkCallback;
                clearForcedBlink();
                if (cb) cb();
                return;
            }

            if (forcedBlinkDuration <= 0) {
                const val = forcedBlinkTarget;
                const cb = forcedBlinkCallback;
                clearForcedBlink();
                blinkProgress = val;
                isBlinking = false;
                if (cb) cb();
                return;
            }
            const t = Math.min(elapsed / forcedBlinkDuration, 1);
            
            // Ease in-out quad
            const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            blinkProgress = forcedBlinkFrom + (forcedBlinkTarget - forcedBlinkFrom) * eased;
            if (t >= 1) {
                const finalVal = forcedBlinkTarget;
                const cb = forcedBlinkCallback;
                clearForcedBlink();
                blinkProgress = finalVal;
                isBlinking = false;
                if (cb) cb();
            }
            // Clamp to valid range
            blinkProgress = Math.max(0, Math.min(1, blinkProgress));
            return;
        }

        // If not actively blinking, ensure we aren't accidentally left fully closed.
        if (!isBlinking) {
            if (blinkProgress > 0.98) {
                blinkProgress = 0;
            } else {
                blinkProgress = 0;
            }
            return;
        }

        if (blinkProgress !== prevBlinkProgress) {
            prevBlinkProgress = blinkProgress;
            lastBlinkProgressChange = performance.now();
        }

        if (forcedBlinkTarget === null && !isBlinking && blinkProgress >= 0.999) {
            const stuckMs = performance.now() - lastBlinkProgressChange;
            if (stuckMs > 1200) {
                console.warn('[sauron] watchdog: blink stuck closed for', Math.round(stuckMs), 'ms — recovering');
                blinkProgress = 0;
                isBlinking = false;
                clearForcedBlink();
            }
        }
        const t = performance.now() - blinkStartTime;
        if (t < BLINK_CLOSE) {
            blinkProgress = t / BLINK_CLOSE;
        } else if (t < BLINK_CLOSE + BLINK_HOLD) {
            blinkProgress = 1;
        } else if (t < BLINK_TOTAL) {
            blinkProgress = 1 - (t - BLINK_CLOSE - BLINK_HOLD) / BLINK_OPEN;
        } else {
            blinkProgress = 0;
            isBlinking = false;
        }

        blinkProgress = Math.max(0, Math.min(1, blinkProgress));
    }

    (function scheduleBlink() {
        setTimeout(() => {
            if (body.classList.contains('dark')) triggerBlink();
            scheduleBlink();
        }, 3000 + Math.random() * 5000);
    })();

    document.addEventListener('click', e => {
        if (e.target.closest('#theme-toggle')) return;
        if (!body.classList.contains('dark')) return;

        if (isBlinking || forcedBlinkTarget !== null) {
            console.debug('[sauron] click ignored during active blink/transition', { blinkProgress, isBlinking, forcedBlinkTarget });
            return;
        }

        const now = Date.now();
        docClickTimes.push(now);
        // keep only last 1s of clicks
        docClickTimes = docClickTimes.filter(t => now - t < 1000);

        if (docClickTimes.length >= 3) {
            docClickTimes = [];
            forcedBlinkTarget = null;
            forcedBlinkCallback = null;
            forcedBlinkDuration = 0;
            forcedBlinkStart = 0;

            forcedBlinkFrom = 1;
            forcedBlinkTarget = 0;
            forcedBlinkDuration = 220;
            forcedBlinkStart = performance.now();
            blinkProgress = 1;
            isBlinking = true;

            return;
        }

        console.debug('[sauron] click:', { blinkProgress, isBlinking, forcedBlinkTarget });

        if (blinkProgress >= 0.98) {
            blinkProgress = 0;
            isBlinking = false;
        }

        triggerBlink();
    });

    // ================================================================
    //  MAIN RENDER LOOP
    // ================================================================
    function render(time) {
        const isDark = body.classList.contains('dark');

        // Always update blink state
        updateBlink();

        ctx.clearRect(0, 0, W, H);

        if (!isDark) {
            particles = [];
            embers = [];
            requestAnimationFrame(render);
            return;
        }

        // Smooth mouse tracking
        smoothMouse.x += (mouse.x - smoothMouse.x) * 0.1;
        smoothMouse.y += (mouse.y - smoothMouse.y) * 0.1;

        const eye = getEyePos();

        // --- Lightning behind everything ---
        drawLightning();

        // --- Draw tower behind everything ---
        drawTower(eye.x, eye.y);

        // --- Spawn fire particles (with caps) ---
        if (blinkProgress < 0.8) {
            for (let i = 0; i < 4; i++) {
                if (particles.length < 300) particles.push(new FireParticle(eye.x, eye.y, false));
            }
            if (Math.random() > 0.6 && embers.length < 100) {
                embers.push(new FireParticle(eye.x, eye.y, true));
            }
        }

        // Update & draw particles
        ctx.save();
        particles = particles.filter(p => p.life > 0);
        for (const p of particles) { p.update(); p.draw(ctx); }
        embers = embers.filter(p => p.life > 0);
        for (const p of embers) { p.update(); p.draw(ctx); }
        ctx.restore();

        // --- Draw beam (behind eye) ---
        drawBeam(eye.x, eye.y, time);

        // --- Draw the eye ---
        drawEye(eye.x, eye.y, time);

        // --- Draw cursor glow ---
        drawCursorGlow(time);

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
})();

// ============================================================================
// LIGHT MODE SCENE — additive only. Own canvas, renderer, scene, loop.
// Never references or mutates the dark mode (Sauron) state above.
// ============================================================================
(function initLightModeScene() {
    if (typeof THREE === 'undefined') {
        console.warn('[lightScene] THREE.js not loaded — skipping');
        return;
    }
    const canvas = document.getElementById('lightModeCanvas');
    const fogOverlay = document.getElementById('fogOverlay');
    if (!canvas) return;

    // ----- State -----
    let isTransitioningLight = false;
    let isLightMode = !document.body.classList.contains('dark');

    // Sync light-mode class with current state on init
    if (isLightMode) {
        document.body.classList.add('light-mode');
    }

    // ----- Renderer -----
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Canvas lives inside .hero — size to the canvas element, not the window.
    const canvasW = () => canvas.clientWidth || window.innerWidth;
    const canvasH = () => canvas.clientHeight || window.innerHeight;
    renderer.setSize(canvasW(), canvasH(), false);
    // ----- Fog mode selection -----
    // Default uses height mode so the valley pooling effect is immediately visible.
    const FOG_MODE = 'height'; // 'exp2' | 'height'

    // Approach 1 (FogExp2) strategy:
    // 1) Use one cool mist color for fog and renderer clear color.
    // 2) Match the sky's low horizon band to that same mist tint.
    // This gives a near-camera cool haze that visually transitions into the
    // darker murky/charcoal sky above, despite FogExp2 using one color.
    const fogColorExp2 = new THREE.Color('#8f9baa');
    const exp2Density = 0.0205;
    const exp2Sky = {
        horizonDissolve: new THREE.Color('#8f9baa'),
        horizonSmoke: new THREE.Color('#4f555d'),
        cloudBelly2: new THREE.Color('#292d34'),
        stormDark: new THREE.Color('#151722'),
        zenith: new THREE.Color('#0b0c13'),
    };

    const heightFog = {
        color: new THREE.Color('#7e8a97'),
        depthDensity: 0.034,
        minY: -5.6,
        maxY: 0.9,
        valleyDensityMul: 3.2,
        highDensityMul: 0.18,
        valleyBoost: 0.28,
    };

    renderer.setClearColor(fogColorExp2, 1);

    // ----- Scene -----
    const scene = new THREE.Scene();
    scene.fog = FOG_MODE === 'exp2' ? new THREE.FogExp2(fogColorExp2, exp2Density) : null;
    const heightFogMaterials = [];

    function applyHeightFogToMaterial(material, cfg) {
        if (!material || material.isShaderMaterial || material.fog === false) return;
        material.fog = true;
        material.onBeforeCompile = (shader) => {
            shader.uniforms.uHeightFogColor = { value: cfg.color };
            shader.uniforms.uHeightFogDepthDensity = { value: cfg.depthDensity };
            shader.uniforms.uHeightFogMinY = { value: cfg.minY };
            shader.uniforms.uHeightFogMaxY = { value: cfg.maxY };
            shader.uniforms.uHeightFogValleyDensityMul = { value: cfg.valleyDensityMul };
            shader.uniforms.uHeightFogHighDensityMul = { value: cfg.highDensityMul };
            shader.uniforms.uHeightFogValleyBoost = { value: cfg.valleyBoost };

            shader.vertexShader = shader.vertexShader
                .replace(
                    '#include <common>',
                    `#include <common>
                    varying vec3 vHeightFogWorldPos;`
                )
                .replace(
                    '#include <begin_vertex>',
                    `#include <begin_vertex>
                    vHeightFogWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
                );

            shader.fragmentShader = shader.fragmentShader
                .replace(
                    '#include <common>',
                    `#include <common>
                    varying vec3 vHeightFogWorldPos;
                    uniform vec3 uHeightFogColor;
                    uniform float uHeightFogDepthDensity;
                    uniform float uHeightFogMinY;
                    uniform float uHeightFogMaxY;
                    uniform float uHeightFogValleyDensityMul;
                    uniform float uHeightFogHighDensityMul;
                    uniform float uHeightFogValleyBoost;`
                )
                .replace(
                    '#include <fog_fragment>',
                    `#ifdef USE_FOG
                    float heightMask = smoothstep(uHeightFogMaxY, uHeightFogMinY, vHeightFogWorldPos.y);
                    float depthToCamera = length(vHeightFogWorldPos - cameraPosition);
                    float localDensity = uHeightFogDepthDensity * mix(
                        uHeightFogHighDensityMul,
                        uHeightFogValleyDensityMul,
                        heightMask
                    );
                    float fogAmount = 1.0 - exp(-depthToCamera * localDensity);
                    fogAmount = clamp(fogAmount + heightMask * uHeightFogValleyBoost, 0.0, 1.0);
                    gl_FragColor.rgb = mix(gl_FragColor.rgb, uHeightFogColor, fogAmount);
                    #endif`
                );
        };
        material.customProgramCacheKey = () => {
            return [
                'height-fog-v1',
                cfg.minY,
                cfg.maxY,
                cfg.depthDensity,
                cfg.valleyDensityMul,
                cfg.highDensityMul,
                cfg.valleyBoost,
            ].join(':');
        };
        material.needsUpdate = true;
    }

    // ----- Camera — Gandalf left foreground, mountains cascade right, tower far right -----
    const DEFAULT_FOV = 50;
    const ZOOM_FOV = 75;
    const camera = new THREE.PerspectiveCamera(DEFAULT_FOV, canvasW() / canvasH(), 0.01, 80);
    const defaultCameraPos = new THREE.Vector3(0, 0.9, 5.5);
    const defaultCameraTarget = new THREE.Vector3(0.8, -0.3, -6);
    camera.position.copy(defaultCameraPos);
    camera.lookAt(defaultCameraTarget);

    // ----- Lights -----
    // Soft directional + ambient only — sun mesh and its PointLight removed entirely.
    const dirLight = new THREE.DirectionalLight(0xfff0cc, 1.25);
    dirLight.position.set(-8, 10, 2);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0xd0d4dc, 0.6));

    // ----- Sky (large PlaneGeometry with GLSL ShaderMaterial) -----
    const skyMat = new THREE.ShaderMaterial({
        uniforms: {
            uHorizonDissolve: { value: exp2Sky.horizonDissolve.clone() },
            uHorizonSmoke: { value: exp2Sky.horizonSmoke.clone() },
            uCloudBelly2: { value: exp2Sky.cloudBelly2.clone() },
            uStormDark: { value: exp2Sky.stormDark.clone() },
            uZenith: { value: exp2Sky.zenith.clone() },
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec2 vUv;
            uniform vec3 uHorizonDissolve;
            uniform vec3 uHorizonSmoke;
            uniform vec3 uCloudBelly2;
            uniform vec3 uStormDark;
            uniform vec3 uZenith;

            // Smooth value noise + 6-octave fbm. The high octave count makes the
            // resulting field smooth enough that it never reads as discrete cells
            // (which is what produced the "oval" artifacts in earlier attempts).
            float hash21(vec2 p) {
                p = fract(p * vec2(123.34, 456.21));
                p += dot(p, p + 45.32);
                return fract(p.x * p.y);
            }
            float vnoise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                float a = hash21(i);
                float b = hash21(i + vec2(1.0, 0.0));
                float c = hash21(i + vec2(0.0, 1.0));
                float d = hash21(i + vec2(1.0, 1.0));
                return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
            }
            float fbm(vec2 p) {
                float v = 0.0;
                float a = 0.5;
                for (int i = 0; i < 6; i++) {
                    v += a * vnoise(p);
                    p = p * 2.07 + vec2(0.31, -0.27);
                    a *= 0.5;
                }
                return v;
            }

            void main() {
                float y = vUv.y;
                float x = vUv.x;

                // ----- Layered vertical gradient -----
                // Five bands so the sky has volumetric depth AND dissolves into
                // the mountain peaks instead of meeting them at a hard edge:
                //   • dissolve: light smoky grey-blue at the very bottom that
                //     matches the distant mountain shoulder tones, so the sky
                //     bleeds into the silhouettes rather than capping them
                //   • horizon: transitional smoky grey
                //   • cloud belly: heavy mid grey-purple, the storm underside
                //   • upper storm: darker grey-purple, deeper cloud mass
                //   • zenith: deepest near-black storm cap, top 25% only
                vec3 horizonDissolve = uHorizonDissolve;
                vec3 horizonSmoke    = uHorizonSmoke;
                vec3 cloudBelly2     = uCloudBelly2;
                vec3 stormDark       = uStormDark;
                vec3 zenith          = uZenith;

                vec3 base;
                if (y < 0.08) {
                    base = mix(horizonDissolve, horizonSmoke, y / 0.08);
                } else if (y < 0.22) {
                    base = mix(horizonSmoke, cloudBelly2, (y - 0.08) / 0.14);
                } else if (y < 0.50) {
                    base = mix(cloudBelly2, stormDark, (y - 0.22) / 0.28);
                } else if (y < 0.78) {
                    base = mix(stormDark, zenith, (y - 0.50) / 0.28);
                } else {
                    base = zenith;
                }

                // ----- Subtle cloud texture: brightness modulation only -----
                // Two stretched fbm layers at different frequencies blend into a
                // soft ±brightness factor. Used as a multiplicative tint on the
                // base color (no separate "cloud color" injected) so it can
                // never produce the bright-blob artifact: where noise is high
                // the sky lifts a touch, where it is low the sky deepens — the
                // hue stays the same. Gated to the mid-sky band so the horizon
                // ember and zenith stay clean.
                float cloudCoarse = fbm(vec2(x * 3.2, y * 1.4 + 0.3));
                float cloudFine   = fbm(vec2(x * 6.8 + 1.7, y * 2.9 - 0.6));
                float cloudVar    = (cloudCoarse - 0.5) * 0.55 + (cloudFine - 0.5) * 0.30;
                float cloudWeight = smoothstep(0.10, 0.32, y) * (1.0 - smoothstep(0.78, 1.0, y));
                base *= 1.0 + cloudVar * cloudWeight * 0.45;

                // ----- Left horizon: cold grey-blue glow -----
                // A faint cooler lift on the lower-left horizon, the side of
                // the world furthest from the fire.
                vec3 hopeTint = vec3(0.46, 0.52, 0.60);
                float hopeX = smoothstep(0.42, 0.0, x);
                float hopeY = smoothstep(0.45, 0.0, y);
                base = mix(base, hopeTint, hopeX * hopeY * 0.50);

                // ----- Right horizon: Mordor fire bleeding upward -----
                // Three stacked ember bands gated horizontally to the right.
                // Each fades up at a different rate so the result reads as heat
                // rising and staining the cloud bases instead of a flat patch.
                float rightX = smoothstep(0.42, 0.95, x);

                // Hot intense ember right at the horizon line
                vec3 emberHot = vec3(0.96, 0.36, 0.08);
                float hotY = pow(1.0 - smoothstep(0.0, 0.12, y), 1.6);
                base = mix(base, emberHot, rightX * hotY * 0.92);

                // Mid orange bleed reaching up into the cloud bases
                vec3 emberMid = vec3(0.62, 0.18, 0.06);
                float midY = 1.0 - smoothstep(0.06, 0.34, y);
                base = mix(base, emberMid, rightX * midY * 0.65);

                // Faint orange-red staining the underside of higher clouds —
                // modulated by the cloud noise so it pools where clouds are
                // denser and feels like firelight catching uneven cloud bases.
                vec3 belly = vec3(0.30, 0.10, 0.07);
                float bellyY = smoothstep(0.18, 0.42, y) * (1.0 - smoothstep(0.42, 0.68, y));
                float bellyMod = 0.65 + cloudCoarse * 0.5;
                base = mix(base, belly, rightX * bellyY * 0.55 * bellyMod);

                gl_FragColor = vec4(base, 1.0);
            }
        `,
        side: THREE.FrontSide,
        depthWrite: false,
        fog: false,
    });
    const skyPlane = new THREE.Mesh(new THREE.PlaneGeometry(60, 35), skyMat);
    skyPlane.position.set(0, 5, -20);
    scene.add(skyPlane);
    if (FOG_MODE === 'height') {
        renderer.setClearColor(heightFog.color, 1);
        skyMat.uniforms.uHorizonDissolve.value.copy(heightFog.color);
        skyMat.uniforms.uHorizonSmoke.value.set('#3f454b');
        skyMat.uniforms.uCloudBelly2.value.set('#22262d');
    }

    // Sun disc + halo removed entirely.

    // ----- Inline seeded noise -----
    function seededNoise(x, seed) {
        return Math.sin(x * 2.3 + seed) * 0.5
             + Math.sin(x * 5.1 + seed * 1.7) * 0.25
             + Math.sin(x * 11.7 + seed * 0.3) * 0.12;
    }

    // Add sharper dramatic peaks to break up the rolling hills
    function ridgedNoise(x, seed) {
        const base = seededNoise(x, seed);
        const ridge = Math.pow(1 - Math.abs(Math.sin(x * 1.6 + seed * 2.1)), 4) * 1.2;
        return base * 0.85 + ridge;
    }

    // ----- Mountains — flat silhouette layers -----
    const layerSpecs = [
        // Farthest Range (Dark silhouette)
        { z: -80,  color: '#2b3642', opacity: 0.15, seed: 2,  y: 0.0, peakScale: 8.0, w: 290, freq: 3.0 },
        // Very Far Range (Dark silhouette)
        { z: -70,  color: '#3a4a58', opacity: 0.3,  seed: 5,  y: -0.5, peakScale: 6.5, w: 260, freq: 3.5 },
        // Far Range (Dark silhouette)
        { z: -60,  color: '#4b5a68', opacity: 0.45, seed: 8,  y: -1.0, peakScale: 5.5, w: 230, freq: 4.0 },
        // Background Horizon
        { z: -50,  color: '#b0bcc8', opacity: 0.6,  seed: 11, y: -1.5, peakScale: 5.0, w: 200, freq: 5.0 },
        // Distant Range
        { z: -40,  color: '#9aafc0', opacity: 0.8,  seed: 23, y: -2.0, peakScale: 4.0, w: 160, freq: 6.0 },
        // Mid Range
        { z: -30,  color: '#849aab', opacity: 1.0, seed: 37, y: -2.5, peakScale: 3.0, w: 120, freq: 7.0 },
        // Front Foothills
        { z: -20,  color: '#6a8090', opacity: 1.0,  seed: 42, y: -3.0, peakScale: 2.0, w: 90,  freq: 8.0 },
        // Baby Foothills (Aligned with Front Foothills)
        { z: -19.5, color: '#556875', opacity: 1.0,  seed: 55, y: -5.0, peakScale: 0.5, w: 90,  freq: 25.0 },
    ];

    let gandalfLayerHeights = [];

    const mountainMeshes = layerSpecs.map((spec, layerIdx) => {
        const geo = new THREE.PlaneGeometry(spec.w, 5, 120, 1);
        const pos = geo.attributes.position;
        const topYs = [];

        for (let i = 0; i < pos.count; i++) {
            const lx = pos.getX(i);
            const ly = pos.getY(i);
            if (ly > 0) { // Displace only the top row
                const nx = (lx + spec.w / 2) / spec.w;
                let h = ridgedNoise(nx * spec.freq, spec.seed) * spec.peakScale;

                // Frame Barad-dûr with broad, misty shoulders and a modest saddle.
                // Keep this softer than the surrounding procedural ridges so the
                // tower reads as distant and embedded, not cut out of the mountain.
                if (layerIdx >= 2 && layerIdx <= 5) {
                    const dx = lx - 23.0; // Tower X is 23.0
                    
                    // Wider, lower Gaussian shoulders soften the peaks behind the tower.
                    const leftPeak = Math.exp(-Math.pow(dx + 4.4, 2) / 8.0) * 0.72;
                    const rightPeak = Math.exp(-Math.pow(dx - 4.6, 2) / 8.5) * 0.45;
                    
                    h += (leftPeak + rightPeak) * spec.peakScale;
                    
                    // A shallow saddle hides the base without exposing black tower fragments.
                    const valleyCut = Math.exp(-Math.pow(dx, 2) / 7.0);
                    const valleyTarget = 0.58 * spec.peakScale;
                    const blend = valleyCut * (layerIdx === 5 ? 0.58 : 0.38);
                    h = h * (1.0 - blend) + valleyTarget * blend;
                }

                pos.setY(i, ly + h);
                // Raise rightmost peak of second layer from front
                if (layerIdx === 7) {
                    const rightBoost = Math.exp(-Math.pow(lx - 45, 2) / 20.0) * 0.6;
                    pos.setY(i, ly + h + rightBoost);
                }
                // Raise rightmost peak of second mountain from front (Front Foothills)
                if (layerIdx === 6) {
                    const rightBoost = Math.exp(-Math.pow(lx - 45, 2) / 22.0) * 1.8;
                    pos.setY(i, ly + h + rightBoost);
                }
                if (layerIdx === 5) { // Update index for mid-range
                    topYs.push({ x: lx, y: spec.y + ly + h });
                }
            }
        }
        geo.computeVertexNormals();

        const mat = new THREE.MeshLambertMaterial({
            color: new THREE.Color(spec.color),
            transparent: spec.opacity < 1,
            opacity: spec.opacity
        });
        heightFogMaterials.push(mat);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(0, spec.y, spec.z);
        scene.add(mesh);

        if (layerIdx === 5) { // Update index for mid-range
            gandalfLayerHeights = topYs.sort((a, b) => a.x - b.x);
        }
        return mesh;
    });

    // ----- Grassy plain — huge plane at a lower Y so the cliff has room to read tall -----
    // Lowered from Y=-2.4 to Y=-3.5: the cliff face now has ~2.4 units of vertical drop
    // visible above grass (was 1.3), while the grass itself shows prominently across the
    // entire bottom of the frame.
    const valleyGeo = new THREE.PlaneGeometry(600, 240, 1, 1);
    const valleyMat = new THREE.MeshLambertMaterial({
        color: new THREE.Color('#424c42'),
        transparent: false,
    });
    heightFogMaterials.push(valleyMat);
    const valley = new THREE.Mesh(valleyGeo, valleyMat);
    valley.rotation.x = -Math.PI / 2;
    valley.position.set(0, -5.4, -15);
    scene.add(valley);

    // ----- Subtle horizontal mist layer hovering over the valley -----
    function makeValleyMistTexture() {
        const c = document.createElement('canvas');
        c.width = 1024; c.height = 128;
        const g = c.getContext('2d');
        const grad = g.createLinearGradient(0, 0, 0, 128);
        grad.addColorStop(0,    'rgba(106, 128, 144, 0.0)');
        grad.addColorStop(0.45, 'rgba(106, 128, 144, 0.44)');
        grad.addColorStop(0.55, 'rgba(106, 128, 144, 0.44)');
        grad.addColorStop(1,    'rgba(106, 128, 144, 0.0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, 1024, 128);
        // Add some soft horizontal blobs for variation
        for (let i = 0; i < 6; i++) {
            const cx = 100 + (i / 6) * 824;
            const r = 90 + (i % 3) * 30;
            const rg = g.createRadialGradient(cx, 64, 4, cx, 64, r);
            rg.addColorStop(0, 'rgba(106, 128, 144, 0.20)');
            rg.addColorStop(1, 'rgba(106, 128, 144, 0)');
            g.fillStyle = rg;
            g.fillRect(0, 0, 1024, 128);
        }
        const tex = new THREE.CanvasTexture(c);
        tex.needsUpdate = true;
        return tex;
    }
    const mistGeo = new THREE.PlaneGeometry(220, 26);
    const mistMat = new THREE.MeshBasicMaterial({
        map: makeValleyMistTexture(),
        transparent: true,
        opacity: 0.86,
        depthWrite: false,
    });
    const mistPlane = new THREE.Mesh(mistGeo, mistMat);
    mistPlane.rotation.x = -Math.PI / 2;
    mistPlane.position.set(0, -3.15, -36); // Constrained to mountain depth only
    scene.add(mistPlane);

    // ----- Low foothill haze — softens the grass-to-mountain meeting line -----
    function makeGroundBlendTexture() {
        const c = document.createElement('canvas');
        c.width = 1024; c.height = 256;
        const g = c.getContext('2d');

        const vertical = g.createLinearGradient(0, 0, 0, 256);
        vertical.addColorStop(0.00, 'rgba(96, 116, 104, 0)');
        vertical.addColorStop(0.18, 'rgba(146, 164, 150, 0.22)');
        vertical.addColorStop(0.40, 'rgba(124, 146, 128, 0.52)');
        vertical.addColorStop(0.58, 'rgba(104, 128, 112, 0.58)');
        vertical.addColorStop(0.78, 'rgba(84, 104, 90, 0.30)');
        vertical.addColorStop(1.00, 'rgba(66, 76, 66, 0)');
        g.fillStyle = vertical;
        g.fillRect(0, 0, 1024, 256);

        for (let i = 0; i < 18; i++) {
            const cx = 40 + i * 88 + Math.sin(i * 2.1) * 28;
            const cy = 86 + Math.sin(i * 1.7) * 48;
            const rx = 150 + Math.sin(i * 3.4) * 44;
            const ry = 50 + Math.cos(i * 2.9) * 18;
            const blob = g.createRadialGradient(cx, cy, 4, cx, cy, rx);
            blob.addColorStop(0, 'rgba(182, 204, 188, 0.18)');
            blob.addColorStop(0.45, 'rgba(142, 166, 148, 0.10)');
            blob.addColorStop(1, 'rgba(190, 204, 210, 0)');
            g.fillStyle = blob;
            g.beginPath();
            g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            g.fill();
        }

        // Feather the texture horizontally so animated fog planes never reveal a hard rectangular end.
        g.globalCompositeOperation = 'destination-in';
        const edgeFade = g.createLinearGradient(0, 0, 1024, 0);
        edgeFade.addColorStop(0.00, 'rgba(0,0,0,0)');
        edgeFade.addColorStop(0.08, 'rgba(0,0,0,1)');
        edgeFade.addColorStop(0.92, 'rgba(0,0,0,1)');
        edgeFade.addColorStop(1.00, 'rgba(0,0,0,0)');
        g.fillStyle = edgeFade;
        g.fillRect(0, 0, 1024, 256);
        g.globalCompositeOperation = 'source-over';

        const tex = new THREE.CanvasTexture(c);
        tex.needsUpdate = true;
        return tex;
    }

    // RepeatWrapping + scrollSpeed lets these inner-mountain mist layers drift
    // right-to-left like the rolling fog above. The ground-blend texture has
    // alpha-fade horizontal edges baked in, so tile boundaries are seamless.
    const groundBlendTex = makeGroundBlendTexture();
    groundBlendTex.wrapS = THREE.RepeatWrapping;
    groundBlendTex.wrapT = THREE.ClampToEdgeWrapping;
    const groundBlendMat = new THREE.MeshBasicMaterial({
        map: groundBlendTex,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        fog: false,
    });
    const groundBlend = new THREE.Mesh(new THREE.PlaneGeometry(120, 6.6), groundBlendMat);
    groundBlend.position.set(0, -2.95, -29.5);
    groundBlend.userData = { scrollSpeed: 0.0070 };
    scene.add(groundBlend);

    const groundBlendTex2 = makeGroundBlendTexture();
    groundBlendTex2.wrapS = THREE.RepeatWrapping;
    groundBlendTex2.wrapT = THREE.ClampToEdgeWrapping;
    const groundBlendBack = new THREE.Mesh(
        new THREE.PlaneGeometry(110, 5.6),
        new THREE.MeshBasicMaterial({
            map: groundBlendTex2,
            transparent: true,
            opacity: 0.48,
            depthWrite: false,
            fog: false,
        })
    );
    groundBlendBack.position.set(3, -2.80, -34.0);
    groundBlendBack.userData = { scrollSpeed: 0.0048 };
    scene.add(groundBlendBack);

    const mountainWisps = [
        // Left wisp sits just behind Gandalf — bumped opacity so the smoke
        // gusts on his side of the frame read clearly.
        { x: -13, y: -2.55, z: -30, w: 28, h: 3.8, opacity: 0.42, scrollSpeed: 0.0080, phase: 0.0 },
        { x: 4,   y: -2.80, z: -33, w: 34, h: 3.6, opacity: 0.32, scrollSpeed: 0.0058, phase: 1.7 },
        { x: 19,  y: -2.50, z: -36, w: 26, h: 4.0, opacity: 0.34, scrollSpeed: 0.0095, phase: 3.1 },
    ].map((cfg) => {
        const tex = makeGroundBlendTexture();
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(cfg.w, cfg.h),
            new THREE.MeshBasicMaterial({
                map: tex,
                transparent: true,
                opacity: cfg.opacity,
                depthWrite: false,
                fog: false,
            })
        );
        mesh.position.set(cfg.x, cfg.y, cfg.z);
        mesh.userData = { ...cfg, tex };
        scene.add(mesh);
        return mesh;
    });

    // ----- Rolling mountain fog — multi-layer drifting mist from right to left -----
    // Each layer is a wide plane with a procedural swirly noise texture. RepeatWrapping
    // lets us scroll texture.offset.x leftward continuously without seams. The vertical
    // alpha falloff inside the texture makes fog densest at the mountain-base line and
    // thin out as it rises, so peaks pierce the mist while valleys stay buried.
    function makeRollingFogTexture(seed) {
        const W = 2048, H = 256;
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const g = c.getContext('2d');

        const rng = (i) => {
            const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
            return x - Math.floor(x);
        };

        const drawBlob = (cx, cy, rx, ry, alpha) => {
            const grad = g.createRadialGradient(cx, cy, 4, cx, cy, Math.max(rx, ry));
            grad.addColorStop(0,    `rgba(206, 216, 228, ${alpha})`);
            grad.addColorStop(0.45, `rgba(184, 198, 214, ${alpha * 0.65})`);
            grad.addColorStop(1,    'rgba(206, 216, 228, 0)');
            g.fillStyle = grad;
            g.beginPath();
            g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            g.fill();
        };

        // Two passes of soft swirly blobs at different scales — bigger, slow body of fog
        // plus smaller wisps and tendrils woven through it.
        const big = 32;
        for (let i = 0; i < big; i++) {
            const cx = rng(i) * W;
            const cy = 90 + rng(i + 100) * 110;
            const rx = 160 + rng(i + 200) * 280;
            const ry = 36 + rng(i + 300) * 64;
            const alpha = 0.34 + rng(i + 400) * 0.34;
            drawBlob(cx, cy, rx, ry, alpha);
            // Wrap copies so the texture tiles seamlessly when RepeatWrapping scrolls it.
            if (cx - rx < 0) drawBlob(cx + W, cy, rx, ry, alpha);
            if (cx + rx > W) drawBlob(cx - W, cy, rx, ry, alpha);
        }
        const small = 70;
        for (let i = 0; i < small; i++) {
            const cx = rng(i + 1000) * W;
            const cy = 60 + rng(i + 1100) * 160;
            const rx = 40 + rng(i + 1200) * 120;
            const ry = 14 + rng(i + 1300) * 30;
            const alpha = 0.18 + rng(i + 1400) * 0.26;
            drawBlob(cx, cy, rx, ry, alpha);
            if (cx - rx < 0) drawBlob(cx + W, cy, rx, ry, alpha);
            if (cx + rx > W) drawBlob(cx - W, cy, rx, ry, alpha);
        }

        // Vertical alpha mask — densest just above the bottom (mountain-base line),
        // thinning toward the top so peaks emerge from the mist. A small bottom feather
        // keeps the lower edge from reading as a hard horizontal line on the grass.
        g.globalCompositeOperation = 'destination-in';
        const vGrad = g.createLinearGradient(0, 0, 0, H);
        vGrad.addColorStop(0.00, 'rgba(0,0,0,0)');
        vGrad.addColorStop(0.18, 'rgba(0,0,0,0.35)');
        vGrad.addColorStop(0.55, 'rgba(0,0,0,1.0)');
        vGrad.addColorStop(0.85, 'rgba(0,0,0,0.85)');
        vGrad.addColorStop(1.00, 'rgba(0,0,0,0.18)');
        g.fillStyle = vGrad;
        g.fillRect(0, 0, W, H);
        g.globalCompositeOperation = 'source-over';

        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.needsUpdate = true;
        return tex;
    }

    // Layer plan, back-to-front. All layers sit IN FRONT of the opaque mid range
    // (z=-30) and front foothills (z=-19.5) so they aren't depth-occluded. Repeats >1
    // give finer texture detail per layer; lower scrollSpeed = slower drift (deeper
    // layers feel further away). Pulse phase/period is unique per layer so banks
    // breathe independently rather than as one wall.
    const rollingFogSpecs = [
        // Deep slow bank, sits high enough to wrap mid-range shoulders and faintly
        // veil the distant peaks beyond. Slowest drift = deepest-feeling layer.
        { y: -1.4, z: -29, w: 140, h: 13.0, repeats: 2.4, opacity: 0.55, scrollSpeed: 0.0040, pulsePeriod: 14.0, pulseAmp: 0.20, phase: 0.4, seed: 11 },
        // Mid bank wrapping mid-range bases — denser, the "valley fog" that fills the
        // gap between the front foothills and the receding ranges behind.
        { y: -2.3, z: -27, w: 130, h:  9.5, repeats: 2.1, opacity: 0.70, scrollSpeed: 0.0062, pulsePeriod: 11.0, pulseAmp: 0.22, phase: 1.6, seed: 23 },
        // High wispy tendrils above the mid-range peaks — wind-driven smoke
        // streaks at Gandalf's altitude. Stronger opacity + larger pulse so the
        // peaks of the gusts read clearly against the dark sky.
        { y:  0.4, z: -25, w: 130, h:  8.0, repeats: 2.8, opacity: 0.62, scrollSpeed: 0.0055, pulsePeriod: 13.0, pulseAmp: 0.22, phase: 3.1, seed: 53 },
        // Densest foothill mist — sits exactly at the grass-meets-mountain line so it
        // softens that junction and partially swallows the foothill bases.
        { y: -2.80, z: -22, w: 105, h: 6.8, repeats: 1.9, opacity: 0.78, scrollSpeed: 0.0090, pulsePeriod:  9.5, pulseAmp: 0.22, phase: 2.3, seed: 37 },
        // Frontmost low valley fog drifting in front of the foothills — fastest,
        // smallest, hugs the grass close to camera.
        { y: -3.65, z: -19, w:  85, h: 5.0, repeats: 1.6, opacity: 0.55, scrollSpeed: 0.0130, pulsePeriod:  8.0, pulseAmp: 0.20, phase: 5.0, seed: 71 },

        // Thin wispy junction layers — short plane heights + high repeats give a
        // streaky, horizontal-wisp character that softens the hard line where the
        // mountain silhouettes meet the grassy plain. Each sits at a slightly
        // different y/z and scrolls at its own rate so the seam never feels static.
        { y: -2.78, z: -28, w: 140, h: 2.6, repeats: 4.2, opacity: 0.55, scrollSpeed: 0.0085, pulsePeriod: 7.2, pulseAmp: 0.18, phase: 0.9, seed: 89 },
        { y: -2.85, z: -24, w: 120, h: 2.2, repeats: 3.8, opacity: 0.50, scrollSpeed: 0.0110, pulsePeriod: 6.4, pulseAmp: 0.16, phase: 4.2, seed: 97 },
        { y: -3.45, z: -20.5, w: 100, h: 1.8, repeats: 4.6, opacity: 0.45, scrollSpeed: 0.0150, pulsePeriod: 5.6, pulseAmp: 0.14, phase: 2.7, seed: 103 },
    ];

    const rollingFogLayers = rollingFogSpecs.map((cfg) => {
        const tex = makeRollingFogTexture(cfg.seed);
        tex.repeat.set(cfg.repeats, 1);
        const mat = new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            opacity: cfg.opacity,
            depthWrite: false,
            fog: false,
        });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(cfg.w, cfg.h), mat);
        mesh.position.set(cfg.x ?? 0, cfg.y, cfg.z);
        mesh.userData = cfg;
        scene.add(mesh);
        return mesh;
    });

    // ----- Snowy mountain top we're standing on — plateau extends across left + bottom -----
    // The white plateau extends FAR left and FAR toward the camera (off-screen on those
    // sides) so the entire left + bottom of the frame reads as smooth snowy ground beneath
    // the viewer. The rocky cliff face is only a small region just to Gandalf's right where
    // the plateau drops to reveal the grass valley below.
    const cliffGeo = new THREE.PlaneGeometry(30, 24, 200, 160);
    {
        const pos = cliffGeo.attributes.position;
        const colors = new Float32Array(pos.count * 3);
        const cornice  = new THREE.Color('#edf2f2');
        const snowBlue = new THREE.Color('#cfd9db');
        const rockMid  = new THREE.Color('#4d5660');
        const rockDark = new THREE.Color('#323a42');
        const rockDeep = new THREE.Color('#424c42'); // matches new grass tone — cliff base blends in
        const PEAK_RISE  = 5.25;
        const OUTER_DROP = -7.35;    // deep enough to fall out of frame without reading as a slab

        // Plateau half-extents and falloff widths (asymmetric).
        // The visible cliff face is only on the right just past Gandalf — every other
        // side extends far enough that the plane edges are off-screen.
        const HX_RIGHT_BASE = 1.15, FX_RIGHT = 2.55; // wider eroded roll-off, less wall-like
        const HX_LEFT  = 12.0, FX_LEFT  = 2.5;       // plateau extends way left, off-screen
        const HY_BACK  = 3.6, FY_BACK  = 1.8;        // softer back lip
        const HY_FRONT = 9.0, FY_FRONT = 2.5;        // plateau extends way to camera, off-screen

        for (let i = 0; i < pos.count; i++) {
            const lx = pos.getX(i);
            const ly = pos.getY(i);
            const dx = lx;
            const dy = ly - 0.5;

            // Right edge erodes in several broad waves instead of forming one cut-out slab.
            const rightWave =
                Math.sin((dy + 0.4) * 1.35) * 0.42 +
                Math.sin(dy * 2.75 - 0.7) * 0.18 +
                Math.sin(dy * 5.1 + 1.4) * 0.08;
            const HX_RIGHT = HX_RIGHT_BASE + rightWave;

            const HX = dx > 0 ? HX_RIGHT : HX_LEFT;
            const FX = dx > 0 ? FX_RIGHT : FX_LEFT;
            const HY = dy > 0 ? HY_BACK  : HY_FRONT;
            const FY = dy > 0 ? FY_BACK  : FY_FRONT;

            // Normalized distance beyond the plateau edge (0 inside plateau, 1 at falloff end)
            const ax = Math.max(0, (Math.abs(dx) - HX) / FX);
            const ay = Math.max(0, (Math.abs(dy) - HY) / FY);
            const distOut = Math.sqrt(ax * ax + ay * ay);

            // Bell: flat 1 inside plateau, smoother roll down to 0 at distOut=1.
            let bell;
            if (distOut <= 0)        bell = 1;
            else if (distOut >= 1)   bell = 0;
            else {
                const s = distOut * distOut * distOut * (distOut * (distOut * 6 - 15) + 10);
                bell = 1 - s;
            }

            // Subtle fluctuations on the cliff face (mid-bell band only)
            const cliffBand = Math.exp(-Math.pow((bell - 0.48) * 2.7, 2));
            const fluctuation = (
                  Math.sin(lx * 1.65 + ly * 1.20) * 0.34
                + Math.sin(ly * 2.40 - lx * 1.90) * 0.20
                + Math.sin(lx * 4.30 - ly * 2.80) * 0.08
            ) * cliffBand;
            const windScoop = Math.max(0, dx - HX_RIGHT + 0.25) * Math.max(0, 1 - Math.abs(dy + 0.8) / 4.5) * 0.18;

            const h = OUTER_DROP + (PEAK_RISE - OUTER_DROP) * bell + fluctuation - windScoop;
            pos.setZ(i, h);

            const t = 1 - bell;
            const snowPatch = (
                Math.sin(lx * 2.4 + ly * 0.9) * 0.08 +
                Math.sin(lx * 6.0 - ly * 2.2) * 0.04
            ) * (1 - Math.min(1, t * 1.6));
            const colorT = Math.max(0, Math.min(1, t - fluctuation * 0.22 - snowPatch));
            const strata = Math.max(0, Math.min(1,
                (Math.sin((ly + h) * 5.2 + lx * 1.1) * 0.5 + 0.5) * cliffBand
            ));
            
            const c = cornice.clone()
                .lerp(snowBlue, Math.min(1, colorT * 1.1))
                .lerp(rockMid,  Math.min(1, Math.max(0, colorT - 0.18) * 1.9))
                .lerp(rockDark, Math.max(0, colorT - 0.34) * strata * 0.35)
                .lerp(rockDeep, Math.max(0, (colorT - 0.5) / 0.5) * 0.85);
            colors[i * 3]     = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
        }
        cliffGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        cliffGeo.computeVertexNormals();
    }
    const cliffMat = new THREE.MeshLambertMaterial({
        vertexColors: true,
        transparent: false,
    });
    heightFogMaterials.push(cliffMat);
    const cliff = new THREE.Mesh(cliffGeo, cliffMat);
    cliff.rotation.x = -Math.PI / 2;
    // Plateau (h = PEAK_RISE = 4.7) sits at world Y = -5.78 + 4.7 = -1.08 — Gandalf's feet.
    cliff.position.set(-2.6, -5.78, -2.0);

    function addCliffContour(dropT, widthOffset, opacity) {
        const pts = [];
        for (let i = 0; i <= 72; i++) {
            const ly = -4.0 + (i / 72) * 8.0;
            const dy = ly - 0.5;
            const edge =
                1.15 +
                Math.sin((dy + 0.4) * 1.35) * 0.42 +
                Math.sin(dy * 2.75 - 0.7) * 0.18 +
                Math.sin(dy * 5.1 + 1.4) * 0.08;
            const x = edge + widthOffset + Math.sin(ly * 2.8 + dropT * 4.0) * 0.055;
            const z = 4.7 + (-7.35 - 4.7) * dropT
                + Math.sin(ly * 1.7 + dropT * 3.2) * 0.18
                + 0.055;
            pts.push(new THREE.Vector3(x, ly, z));
        }
        const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({
                color: 0x2f3940,
                transparent: true,
                opacity,
                depthWrite: false,
                fog: true,
            })
        );
        cliff.add(line);
    }
    addCliffContour(0.18, 0.05, 0.42);
    addCliffContour(0.36, 0.18, 0.36);
    addCliffContour(0.56, 0.30, 0.30);
    addCliffContour(0.74, 0.42, 0.24);
    scene.add(cliff);

    // ----- Terrain height lookup -----
    function getHeightAt(worldX) {
        if (!gandalfLayerHeights || gandalfLayerHeights.length === 0) return 0;
        const arr = gandalfLayerHeights;
        if (worldX <= arr[0].x) return arr[0].y;
        if (worldX >= arr[arr.length - 1].x) return arr[arr.length - 1].y;
        for (let i = 0; i < arr.length - 1; i++) {
            if (worldX >= arr[i].x && worldX <= arr[i + 1].x) {
                const t = (worldX - arr[i].x) / (arr[i + 1].x - arr[i].x);
                return arr[i].y * (1 - t) + arr[i + 1].y * t;
            }
        }
        return 0;
    }

    // ----- Mist bands -----
    function makeMistTexture() {
        const c = document.createElement('canvas');
        c.width = 512; c.height = 128;
        const g = c.getContext('2d');
        const blobs = [
            { cx: 128, cy: 64, r: 100 },
            { cx: 256, cy: 50, r: 120 },
            { cx: 384, cy: 70, r: 90 },
            { cx: 200, cy: 80, r: 80 },
        ];
        for (const b of blobs) {
            const grad = g.createRadialGradient(b.cx, b.cy, 4, b.cx, b.cy, b.r);
            grad.addColorStop(0, 'rgba(255,255,255,0.15)');
            grad.addColorStop(0.5, 'rgba(255,255,255,0.06)');
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = grad;
            g.fillRect(0, 0, 512, 128);
        }
        const tex = new THREE.CanvasTexture(c);
        tex.needsUpdate = true;
        return tex;
    }

    // Floating mist ovals removed — they read as UFOs against the sky.
    void makeMistTexture;

    // ----- Clouds removed -----
    // The old puffy white-blob cloud sprites read as bright ovals against the
    // dark Mordor sky. Atmosphere now comes entirely from the sky shader's
    // ember/storm gradient and the rolling fog layers below the mountains.
    const clouds = [];

    // ----- Barad-dûr — sits on the mountains on the right. MeshBasicMaterial = unlit, always dark.
    // Smooth 3-tier fortress with subtle overhang ledges; wide crown platform hosts the eye
    // and lets thin prongs sit on its outer edge.
    // x shifted left from 22.9 so the tower aligns with the saddle's higher (left) peak,
    // which hides the right-side base from poking out of the mountain. z pushed deeper for
    // the same reason. (See mountain-shoulder code: leftPeak amp 0.72 > rightPeak amp 0.62.)
    const baraddurPos = { x: 22.4, y: -0.6, z: -31.0 };
    const baraddurScale = 2.0;
    const baraddur = new THREE.Group();
    const towerColor = 0x000000;
    const newDarkMat = () => new THREE.MeshBasicMaterial({ color: towerColor, fog: false });

    // Tier 1 — slimmer base, tapers in
    const tBase = new THREE.Mesh(new THREE.CylinderGeometry(0.162, 0.260, 0.38, 16), newDarkMat());
    tBase.position.y = 0.19;
    baraddur.add(tBase);
    // Tier 2 — bottom 0.196 overhangs tier 1's top 0.162 (small ledge), tapers to 0.130
    const tMid = new THREE.Mesh(new THREE.CylinderGeometry(0.130, 0.196, 0.30, 16), newDarkMat());
    tMid.position.y = 0.53;
    baraddur.add(tMid);
    // Tier 3 — bottom 0.162 overhangs tier 2's top 0.130, tapers to 0.109
    const tUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.109, 0.162, 0.26, 16), newDarkMat());
    tUpper.position.y = 0.81;
    baraddur.add(tUpper);
    // Crown platform — scaled 0.5x to read as subtle needle top, not torch
    // Eye fits inside, prongs flare subtly from outer edge.
    const tCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.114, 0.0865, 0.08, 16), newDarkMat());
    tCrown.position.y = 0.98;
    baraddur.add(tCrown);

    // Thin, elegant prongs inspired by dark mode
    class ThinProngProfile extends THREE.Curve {
        constructor() { super(); }
        getPoint(t, target = new THREE.Vector3()) {
            const taper = Math.pow(1 - t, 0.8);
            const w = 0.025 * taper;
            return target.set(w, t * 0.20, 0);
        }
    }
    
    // Curved path for prong — extends outward first, then up
    class ThinProngCurve extends THREE.Curve {
        constructor(side) { super(); this.side = side; }
        getPoint(t, target = new THREE.Vector3()) {
            const r = 0.09;
            return target.set(
                this.side * r * Math.sin(t * Math.PI / 2),
                r * t * t,
                0
            );
        }
    }
    
    for (const side of [-1, 1]) {
        const prongGeo = new THREE.TubeGeometry(new ThinProngCurve(side), 16, 0.018, 6, false);
        const prong = new THREE.Mesh(prongGeo, newDarkMat());
        prong.position.set(side * 0.11, 1.02, 0);
        baraddur.add(prong);
    }

    // Eye of Sauron — PlaneGeometry sprite with hi-res canvas texture
    function makeTowerEyeTexture() {
        const c = document.createElement('canvas');
        c.width = 512; c.height = 256;
        const g = c.getContext('2d');
        g.clearRect(0, 0, c.width, c.height);

        const cx = 256, cy = 128;
        const eyeW = 220, eyeH = 92;

        // Outer fiery halo
        const outerGlow = g.createRadialGradient(cx, cy, 4, cx, cy, eyeW * 1.25);
        outerGlow.addColorStop(0.00, 'rgba(255,190,90,0.55)');
        outerGlow.addColorStop(0.38, 'rgba(225,95,22,0.32)');
        outerGlow.addColorStop(1.00, 'rgba(60,12,4,0)');
        g.fillStyle = outerGlow;
        g.beginPath();
        g.ellipse(cx, cy, eyeW * 1.12, eyeH * 1.05, 0, 0, Math.PI * 2);
        g.fill();

        // Almond eye shape (asymmetric bezier above/below for a Sauron tilt)
        g.beginPath();
        g.moveTo(cx - eyeW, cy);
        g.bezierCurveTo(cx - eyeW * 0.55, cy - eyeH * 1.25, cx + eyeW * 0.55, cy - eyeH * 1.05, cx + eyeW, cy);
        g.bezierCurveTo(cx + eyeW * 0.55, cy + eyeH * 1.18, cx - eyeW * 0.55, cy + eyeH * 1.32, cx - eyeW, cy);
        g.closePath();

        // Orange iris radial gradient — bright yellow core to deep red rim
        const irisGrad = g.createRadialGradient(cx, cy, 6, cx, cy, eyeW);
        irisGrad.addColorStop(0.00, 'rgba(255,240,150,1.0)');
        irisGrad.addColorStop(0.25, 'rgba(255,170,50,1.0)');
        irisGrad.addColorStop(0.65, 'rgba(210,60,12,0.97)');
        irisGrad.addColorStop(1.00, 'rgba(20,6,4,0.97)');
        g.fillStyle = irisGrad;
        g.fill();

        // Almond eyelid outline
        g.lineWidth = 9;
        g.strokeStyle = 'rgba(14,5,2,0.95)';
        g.stroke();

        // Vertical slit pupil
        g.fillStyle = 'rgba(6,1,0,0.99)';
        g.beginPath();
        g.ellipse(cx, cy, 9, eyeH * 0.86, 0, 0, Math.PI * 2);
        g.fill();

        // Catch-light highlight on the iris
        g.fillStyle = 'rgba(255,240,180,0.42)';
        g.beginPath();
        g.ellipse(cx - 30, cy - 18, 20, 10, -0.32, 0, Math.PI * 2);
        g.fill();

        const tex = new THREE.CanvasTexture(c);
        tex.needsUpdate = true;
        return tex;
    }

    const eyeMat = new THREE.MeshBasicMaterial({
        map: makeTowerEyeTexture(),
        transparent: true,
        depthWrite: false,
        depthTest: false,
        fog: false,
        side: THREE.DoubleSide,
    });
    // Eye fits INSIDE the crown — width 0.70 < crown top diameter 0.84, between prongs at ±0.40.
    const eye = new THREE.Mesh(new THREE.PlaneGeometry(0.40, 0.125), eyeMat);
    eye.position.set(0.025, 1.11, -0.04);
    eye.renderOrder = 6; // keep slit/pupil readable above additive glow layers
    baraddur.add(eye);

    // Ember at the eye — tight 1.2 distance so it doesn't paint the whole tower red
    const emberLight = new THREE.PointLight(0xff2200, 2.0, 1.2);
    emberLight.position.set(0, 1.45, 0);
    baraddur.add(emberLight);

    baraddur.position.set(baraddurPos.x, baraddurPos.y, baraddurPos.z);
    // Thinner fortress proportions — less X/Z scale than before, same Y.
    baraddur.scale.set(baraddurScale * 0.85, baraddurScale * 1.5, baraddurScale * 0.85);
    scene.add(baraddur);

    // ----- Eye blink state -----
    const eyeBaseScaleY = eye.scale.y;
    let eyeBlinkOpen = 1.0;
    let eyeBlinkIntensityMul = 1.0;
    let eyeIsBlinking = false;
    let eyeBlinkTimer = 0;
    let eyeBlinkGapTimer = 0;
    let eyeBlinkRepeatsRemaining = 0;
    const eyeBlinkDuration = 0.13;
    let eyeBlinkGapDuration = 0.085;
    const eyeBlinkMinOpen = 0.03;
    let eyeBlinkBurstRemaining = 0;
    let nextEyeBlinkAt = rand(4.2, 6.8);

    function scheduleNextEyeBlink(now) {
        if (eyeBlinkBurstRemaining > 0) {
            eyeBlinkBurstRemaining -= 1;
            nextEyeBlinkAt = now + rand(2.28, 3.15);
            return;
        }
        const roll = Math.random();
        if (roll < 0.38) {
            eyeBlinkBurstRemaining = Math.floor(rand(1, 3)); // 1-2 extra near-future blinks
            nextEyeBlinkAt = now + rand(3.8, 6.5);
        } else if (roll < 0.83) {
            nextEyeBlinkAt = now + rand(6.5, 10.5);
        } else {
            nextEyeBlinkAt = now + rand(10.5, 16.0); // occasional long pause
        }
    }

    function makeEyeGlowTexture() {
        const c = document.createElement('canvas');
        c.width = 256; c.height = 256;
        const g = c.getContext('2d');
        const cx = 128, cy = 128;
        const grad = g.createRadialGradient(cx, cy, 4, cx, cy, 118);
        grad.addColorStop(0.00, 'rgba(255,228,140,0.95)');
        grad.addColorStop(0.18, 'rgba(255,120,36,0.72)');
        grad.addColorStop(0.45, 'rgba(255,52,20,0.40)');
        grad.addColorStop(0.80, 'rgba(165,20,10,0.10)');
        grad.addColorStop(1.00, 'rgba(100,0,0,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, c.width, c.height);
        const tex = new THREE.CanvasTexture(c);
        tex.needsUpdate = true;
        return tex;
    }

    function makeEyeFlameTexture() {
        const c = document.createElement('canvas');
        c.width = 96; c.height = 96;
        const g = c.getContext('2d');
        const grad = g.createRadialGradient(48, 48, 3, 48, 48, 44);
        grad.addColorStop(0.00, 'rgba(255,245,180,1.0)');
        grad.addColorStop(0.25, 'rgba(255,156,55,0.95)');
        grad.addColorStop(0.62, 'rgba(255,66,18,0.55)');
        grad.addColorStop(1.00, 'rgba(120,8,0,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, c.width, c.height);
        const tex = new THREE.CanvasTexture(c);
        tex.needsUpdate = true;
        return tex;
    }

    const eyeGlow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeEyeGlowTexture(),
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending,
    }));
    eyeGlow.position.set(eye.position.x, eye.position.y, eye.position.z - 0.02);
    eyeGlow.scale.set(0.95, 0.36, 1);
    eyeGlow.renderOrder = 2;
    baraddur.add(eyeGlow);

    const eyeCoreGlow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeEyeGlowTexture(),
        transparent: true,
        opacity: 0.40,
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending,
    }));
    eyeCoreGlow.position.set(eye.position.x, eye.position.y, eye.position.z - 0.024);
    eyeCoreGlow.scale.set(0.42, 0.16, 1);
    eyeCoreGlow.renderOrder = 3;
    baraddur.add(eyeCoreGlow);

    const eyeFlameTexture = makeEyeFlameTexture();
    const eyeFlameParticles = [];
    let nextEyeFlameSpawnAt = 0;

    // ----- Spotlight search state machine (with Volumetric Beam) -----
    // Eye is parented to the baraddur group, which is scaled (1.7, 3.0, 1.7) — local offsets must be scaled too.
    const eyeWorldPos = new THREE.Vector3(
        baraddurPos.x + 0.025 * baraddur.scale.x,
        baraddurPos.y + 1.11  * baraddur.scale.y,
        baraddurPos.z + -0.04 * baraddur.scale.z
    );

    // Painted CanvasTexture — pure soft glow. Gaussian falloff in both axes (no hard edges
    // anywhere), RGB premultiplied by alpha so additive blending contributes nothing at the
    // boundary. Bright fiery tip at canvas top (= plane top after default UV mapping), fading
    // to rgba(0,0,0,0) at the sides and the far end.
    const beamTex = (function makeBeamTexture() {
        const W = 256, H = 512;
        const cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        const cx = cv.getContext('2d');
        const img = cx.createImageData(W, H);
        for (let y = 0; y < H; y++) {
            const v = y / H;                                       // 0 = bright tip, 1 = far end
            // True point at the tip → no visible glow above/below the eye. Pinched tip,
            // big fan at the far end so the cone really spreads on the mountains.
            const halfWidth = 0.003 + v * v * 0.55;
            // Length envelope: peak just past the tip, gentle long tail so the wide end stays bright.
            const lenFade = Math.exp(-Math.pow((v - 0.04) * 1.4, 2));
            for (let x = 0; x < W; x++) {
                const dx = ((x / W) - 0.5) / halfWidth;            // dimensionless: 0 at center, ±1 at "edge"
                const horiz = Math.exp(-dx * dx * 2.5);            // smooth Gaussian, never hits a true zero
                const a = lenFade * horiz;
                // Color hot at the core (yellow-white), shifting orange→deep red along the length.
                const r = 255;
                const g = 230 * (1 - v) + 90 * v;
                const b = 110 * (1 - v) + 10 * v;
                const i = (y * W + x) * 4;
                img.data[i]     = Math.floor(r * a);               // premultiplied: edges → black
                img.data[i + 1] = Math.floor(g * a);
                img.data[i + 2] = Math.floor(b * a);
                img.data[i + 3] = Math.floor(a * 255);
            }
        }
        cx.putImageData(img, 0, 0);
        const tex = new THREE.CanvasTexture(cv);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        return tex;
    })();

    // Plane: long enough to carry past the mountains, wide enough to fan over the valley.
    // After translate(0, -L/2, 0): bright tip sits at local (0,0,0), wide end at (0,-L,0).
    const BEAM_WIDTH = 22;
    const BEAM_LENGTH = 38;
    const beamGeo = new THREE.PlaneGeometry(BEAM_WIDTH, BEAM_LENGTH);
    beamGeo.translate(0, -BEAM_LENGTH / 2, 0);

    const beamMaterial = new THREE.MeshBasicMaterial({
        map: beamTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,                     // pure light: never occluded by terrain
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
    });

    // Aim quaternion: orient so the local -Y of any blade aligns with the eye → valley
    // direction (wide end falls into the scene). Plane normal lands wherever — for blades
    // arrangement we don't try to face camera; instead we fan many planes around the beam
    // axis so SOMETHING is broadside from any view.
    const valleyCenter = new THREE.Vector3(0, -1.8, -23);
    const beamDir = valleyCenter.clone().sub(eyeWorldPos).normalize();
    const yAxis = beamDir.clone().negate();                                          // mesh +Y points back to eye
    // Pick any horizontal axis perpendicular to yAxis as the initial reference for blade #0.
    const helper = Math.abs(yAxis.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const xAxis = new THREE.Vector3().crossVectors(yAxis, helper).normalize();
    const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();
    const aimMatrix = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
    const aimQuaternion = new THREE.Quaternion().setFromRotationMatrix(aimMatrix);

    // Sweeper: rotates around WORLD-Y at the eye for the lighthouse sweep.
    // Pitch uses world-Z (≈ horizontal, perpendicular to the mostly -X beam) so it reads as up/down tilt.
    const sauronBeamSweeper = new THREE.Object3D();
    sauronBeamSweeper.rotation.order = 'YZX';

    // Blade group: aim quaternion goes here once. Each blade is a child with only a local
    // rotation around its own Y (= beam length axis), fanning the planes around the beam.
    // From any side angle several blades are broadside; from dead-on the bright pinched tips
    // additively pile up into a circular bloom — no special-case halo needed.
    const sauronBeamBlades = new THREE.Object3D();
    sauronBeamBlades.quaternion.copy(aimQuaternion);
    sauronBeamSweeper.add(sauronBeamBlades);

    const NUM_BLADES = 6; // DoubleSide → each blade represents 2 facings, so 6 = 12 effective rays
    const blades = [];
    for (let i = 0; i < NUM_BLADES; i++) {
        const blade = new THREE.Mesh(beamGeo, beamMaterial); // shared geo + material
        blade.rotation.y = (i / NUM_BLADES) * Math.PI;       // spin around beam length axis
        blade.renderOrder = 10;
        blade.frustumCulled = false;
        sauronBeamBlades.add(blade);
        blades.push(blade);
    }

    // Root: positioned at the eye, NO rotation → its local axes are world axes.
    const sauronBeamRoot = new THREE.Object3D();
    sauronBeamRoot.position.copy(eyeWorldPos);
    sauronBeamRoot.add(sauronBeamSweeper);
    scene.add(sauronBeamRoot);

    const BEAM_STATE = {
        WAITING: 0,
        FULL_CIRCLE: 1,
        GANDALF_HOLD: 2,
        RANDOM_TARGETING: 3,
        COOLDOWN: 4,
    };
    const BEAM_STATE_LABEL = {
        [BEAM_STATE.WAITING]: 'waiting',
        [BEAM_STATE.FULL_CIRCLE]: 'full-sweep',
        [BEAM_STATE.GANDALF_HOLD]: 'gandalf-look',
        [BEAM_STATE.RANDOM_TARGETING]: 'random-targeting',
        [BEAM_STATE.COOLDOWN]: 'cooldown',
    };
    let beamState = BEAM_STATE.WAITING;
    let beamStateTimer = 0;
    let currentOpacity = 0;
    // Per-blade peak opacity. With NUM_BLADES additively blending, the visual brightness ≈
    // MAX_OPACITY × (visible-blade count from current view), so this stays well below 1.
    const MAX_OPACITY = 0.22;
    const randRange = (min, max) => min + Math.random() * (max - min);
    const normalizeAngle = (a) => {
        const twopi = Math.PI * 2;
        return ((a % twopi) + twopi) % twopi;
    };
    const shortestAngleDelta = (from, to) => {
        const twopi = Math.PI * 2;
        return ((((to - from) + Math.PI) % twopi) + twopi) % twopi - Math.PI;
    };
    const lerpAngle = (from, to, t) => from + shortestAngleDelta(from, to) * t;

    const fullCircleDuration = 18.0;
    const gandalfHoldDuration = 5.0;
    const randomPhaseDurationRange = { min: 18.0, max: 30.0 };
    const cooldownDuration = 28.0;
    const activeFadeDuration = 1.5;

    let fullCircleStartYaw = 0;
    let beamYaw = 0;
    let beamPitch = 0;
    let beamTargetYaw = 0;
    let beamTargetPitch = 0;

    let randomPhaseDuration = 0;
    let randomTargetMoveTimer = 0;
    let randomTargetHoldTimer = 0;
    let randomTargetMoveDuration = 0;
    let randomTargetHoldDuration = 0;
    let randomTargetFromYaw = 0;
    let randomTargetFromPitch = 0;
    let randomTargetToYaw = 0;
    let randomTargetToPitch = 0;
    let isRandomTargetHolding = false;

    const beamAzimuthOffset = (targetDir) => {
        const base = new THREE.Vector2(beamDir.x, beamDir.z).normalize();
        const next = new THREE.Vector2(targetDir.x, targetDir.z).normalize();
        const cross = base.x * next.y - base.y * next.x;
        const dot = THREE.MathUtils.clamp(base.dot(next), -1, 1);
        return Math.atan2(cross, dot);
    };

    const directionToSweeperAngles = (targetWorldPos) => {
        const dir = targetWorldPos.clone().sub(eyeWorldPos).normalize();
        const yaw = beamAzimuthOffset(dir);
        const pitch = THREE.MathUtils.clamp((dir.y - beamDir.y) * 1.25, -0.24, 0.24);
        return { yaw, pitch };
    };

    let gandalfBeamTarget = null;
    let randomBeamTargets = [];
    console.log('[beam-debug] start waiting');

    function startRandomTargetMove(elapsed) {
        if (!randomBeamTargets.length) return;
        const target = randomBeamTargets[Math.floor(Math.random() * randomBeamTargets.length)];
        const angles = directionToSweeperAngles(target);
        randomTargetFromYaw = beamYaw;
        randomTargetFromPitch = beamPitch;
        randomTargetToYaw = angles.yaw;
        randomTargetToPitch = angles.pitch;
        randomTargetMoveDuration = randRange(1.2, 2.5);
        randomTargetHoldDuration = randRange(0.9, 2.2);
        randomTargetMoveTimer = 0;
        randomTargetHoldTimer = 0;
        isRandomTargetHolding = false;
        beamStateTimer = Math.max(beamStateTimer, 0);
        if (typeof elapsed === 'number') {
            // tiny deterministic jitter anchor so repeated states don't feel robotic
            randomTargetToPitch += Math.sin(elapsed * 1.7) * 0.01;
        }
        console.log(
            '[beam-debug] start random-move',
            {
                to: {
                    x: Number(target.x.toFixed(2)),
                    y: Number(target.y.toFixed(2)),
                    z: Number(target.z.toFixed(2)),
                },
                moveSec: Number(randomTargetMoveDuration.toFixed(2)),
                holdSec: Number(randomTargetHoldDuration.toFixed(2)),
            }
        );
    }

    function enterBeamState(nextState, elapsed) {
        const prevState = beamState;
        if (prevState !== nextState) {
            console.log('[beam-debug] stop', BEAM_STATE_LABEL[prevState], 'at', Number(beamStateTimer.toFixed(2)), 's');
            console.log('[beam-debug] start', BEAM_STATE_LABEL[nextState]);
        }
        beamState = nextState;
        beamStateTimer = 0;
        if (nextState === BEAM_STATE.FULL_CIRCLE) {
            fullCircleStartYaw = normalizeAngle(beamYaw);
        } else if (nextState === BEAM_STATE.GANDALF_HOLD) {
            if (gandalfBeamTarget) {
                const aim = directionToSweeperAngles(gandalfBeamTarget);
                beamTargetYaw = aim.yaw;
                beamTargetPitch = aim.pitch;
            }
        } else if (nextState === BEAM_STATE.RANDOM_TARGETING) {
            randomPhaseDuration = randRange(randomPhaseDurationRange.min, randomPhaseDurationRange.max);
            startRandomTargetMove(elapsed);
        }
    }

    // ----- Gandalf billboard — left foreground, standing on the cliff edge -----
    const gandalfTexture = new THREE.TextureLoader().load('Images/gandalf.png');
    // Make Gandalf slightly larger
    const gandalfW = 0.95;
    const gandalfH = 1.25;
    const gandalfGeo = new THREE.PlaneGeometry(gandalfW, gandalfH);
    const gandalfMat = new THREE.MeshBasicMaterial({
        map: gandalfTexture,
        transparent: true,
        alphaTest: 0.1,
        depthWrite: false,
        side: THREE.DoubleSide,
    });
    const gandalf = new THREE.Mesh(gandalfGeo, gandalfMat);

    // Position: moved even further down and left from the cliff edge
    const gandalfX = -3.9;
    const gandalfZ = -2.5;
    const gandalfWorldY = 0.05;
    const gandalfBaseY = gandalfWorldY;
    gandalf.position.set(gandalfX, gandalfWorldY, gandalfZ);
    gandalf.rotation.y = 0.0; // facing right toward the tower (back of cloak to camera)
    gandalf.renderOrder = 2;
    scene.add(gandalf);

    gandalfBeamTarget = new THREE.Vector3(gandalfX, gandalfWorldY + 1.15, gandalfZ);
    randomBeamTargets = [
        // Mountain-focused anchors
        new THREE.Vector3(-10.5, -1.6, -27.5),
        new THREE.Vector3(-3.8, -1.9, -29.0),
        new THREE.Vector3(3.5, -1.7, -27.0),
        new THREE.Vector3(11.0, -1.5, -30.0),
        new THREE.Vector3(17.5, -1.4, -28.5),
        // Near-Gandalf scouting anchors
        new THREE.Vector3(gandalfX - 2.6, gandalfWorldY + 0.35, gandalfZ - 4.5),
        new THREE.Vector3(gandalfX + 1.6, gandalfWorldY + 0.45, gandalfZ - 5.0),
        new THREE.Vector3(gandalfX + 3.4, gandalfWorldY + 0.7, gandalfZ - 6.3),
    ];

    // Tiny pipe tucked by Gandalf's mouth line.
    const pipeMaterial = new THREE.MeshBasicMaterial({ color: 0x1c1715 });
    const pipeBowlMaterial = new THREE.MeshBasicMaterial({ color: 0x1a120f });
    const pipeStem = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.009, 0.011), pipeMaterial);
    pipeStem.position.set(0.108, 0.352, 0.028);
    pipeStem.rotation.set(0.02, -0.22, -0.36);
    pipeStem.renderOrder = 3;
    gandalf.add(pipeStem);
    const pipeBowlOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.008, 0.02, 14), pipeBowlMaterial);
    pipeBowlOuter.position.set(0.052, 0.003, 0.0);
    pipeBowlOuter.rotation.z = 0.06;
    pipeBowlOuter.renderOrder = 3;
    pipeStem.add(pipeBowlOuter);
    const pipeBowlChamber = new THREE.Mesh(new THREE.CircleGeometry(0.0058, 14), new THREE.MeshBasicMaterial({ color: 0x070606 }));
    pipeBowlChamber.position.set(0.052, 0.0135, 0.0);
    pipeBowlChamber.rotation.x = -Math.PI * 0.5;
    pipeBowlChamber.renderOrder = 3;
    pipeStem.add(pipeBowlChamber);

    // Pipe smoke particles (organic, irregular puffs drifting left with altitude).
    const smokeParticles = [];
    const lightWispBaseColor = new THREE.Color(0xeaf2fb);
    const darkSmokeBaseColor = new THREE.Color(0x8f98a6);
    const pipeTipLocal = new THREE.Vector3(0.052, 0.016, 0);
    const pipeTipWorld = new THREE.Vector3();
    const TAU = Math.PI * 2;
    let nextDarkSmokeAt = 0;
    let nextWispAt = 0;
    let queuedDarkGroupPuffs = 0;
    let breezeStrength = 0;
    let breezeTarget = 0;
    let nextBreezeShiftAt = 0;
    let breezeTurbulence = 0;
    let breezeFreq = 0.3;
    let breezePhase = Math.random() * TAU;

    function rand(min, max) {
        return min + Math.random() * (max - min);
    }

    function emitEyeFlameParticle() {
        if (!eyeFlameTexture || eyeFlameParticles.length > 110) return;
        const mat = new THREE.SpriteMaterial({
            map: eyeFlameTexture,
            transparent: true,
            depthWrite: false,
            fog: false,
            blending: THREE.AdditiveBlending,
            opacity: rand(0.38, 0.82),
            color: new THREE.Color(0xff5d22).offsetHSL(rand(-0.015, 0.02), rand(-0.04, 0.05), rand(-0.06, 0.08)),
        });
        const s = new THREE.Sprite(mat);
        const startScale = rand(0.030, 0.072);
        s.scale.set(startScale, startScale * rand(1.2, 1.8), 1);
        s.position.set(
            eye.position.x + rand(-0.14, 0.14),
            eye.position.y + rand(-0.05, 0.06),
            eye.position.z + rand(-0.05, 0.03)
        );
        s.renderOrder = 3;
        baraddur.add(s);
        eyeFlameParticles.push({
            sprite: s,
            age: 0,
            life: rand(0.22, 0.58),
            startScale,
            grow: rand(0.05, 0.18),
            vx: rand(-0.08, 0.08),
            vy: rand(0.045, 0.17),
            vz: rand(-0.05, 0.05),
            wobbleAmp: rand(0.02, 0.09),
            wobbleFreq: rand(8.0, 16.0),
            phase: rand(0, Math.PI * 2),
        });
    }

    function updateEyeFlame(deltaTime, elapsed) {
        if (elapsed >= nextEyeFlameSpawnAt) {
            const spawnCount = Math.random() < 0.32 ? 2 : 1;
            for (let i = 0; i < spawnCount; i++) emitEyeFlameParticle();
            nextEyeFlameSpawnAt = elapsed + rand(0.025, 0.11);
        }
        for (let i = eyeFlameParticles.length - 1; i >= 0; i--) {
            const p = eyeFlameParticles[i];
            p.age += deltaTime;
            const t = p.age / p.life;
            if (t >= 1) {
                baraddur.remove(p.sprite);
                p.sprite.material.dispose();
                eyeFlameParticles.splice(i, 1);
                continue;
            }
            p.sprite.position.x += (p.vx + Math.sin(elapsed * p.wobbleFreq + p.phase) * p.wobbleAmp) * deltaTime;
            p.sprite.position.y += p.vy * deltaTime;
            p.sprite.position.z += p.vz * deltaTime;
            const flameScale = p.startScale + p.grow * (0.45 * t + t * t);
            p.sprite.scale.set(flameScale, flameScale * 1.45, 1);
            p.sprite.material.opacity = Math.pow(1 - t, 1.35) * 0.95;
        }
    }

    function makeSmokeTexture() {
        const size = 128;
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const g = c.getContext('2d');
        if (!g) return null;

        const cx = size * 0.5;
        const cy = size * 0.5;
        const grad = g.createRadialGradient(cx, cy, size * 0.05, cx, cy, size * 0.5);
        grad.addColorStop(0.0, 'rgba(240,248,255,0.95)');
        grad.addColorStop(0.3, 'rgba(220,232,248,0.58)');
        grad.addColorStop(0.65, 'rgba(210,224,245,0.20)');
        grad.addColorStop(1.0, 'rgba(210,224,245,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, size, size);

        // Soft lumpy edges so wisps are less perfectly circular.
        g.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 7; i++) {
            g.beginPath();
            g.arc(rand(size * 0.12, size * 0.88), rand(size * 0.12, size * 0.88), rand(size * 0.06, size * 0.18), 0, TAU);
            g.fillStyle = `rgba(0,0,0,${rand(0.03, 0.09).toFixed(3)})`;
            g.fill();
        }
        g.globalCompositeOperation = 'source-over';

        const tex = new THREE.CanvasTexture(c);
        tex.needsUpdate = true;
        return tex;
    }

    const smokeTexture = makeSmokeTexture();

    if (FOG_MODE === 'height') {
        for (const mat of heightFogMaterials) {
            applyHeightFogToMaterial(mat, heightFog);
        }
    }

    function getPipeTipWorld() {
        pipeTipWorld.copy(pipeTipLocal);
        pipeStem.localToWorld(pipeTipWorld);
        return pipeTipWorld;
    }

    function queueNextDarkSmoke(now) {
        if (queuedDarkGroupPuffs > 0) {
            queuedDarkGroupPuffs -= 1;
            nextDarkSmokeAt = now + rand(0.34, 0.85);
            return;
        }

        const roll = Math.random();
        if (roll < 0.48) {
            queuedDarkGroupPuffs = Math.floor(rand(1, 4));
            nextDarkSmokeAt = now + rand(1.8, 4.8);
        } else {
            nextDarkSmokeAt = now + rand(4.8, 8.8);
        }
    }

    function queueNextWisp(now) {
        nextWispAt = now + rand(0.08, 0.2);
    }

    function updateBreeze(elapsed, deltaTime) {
        if (elapsed >= nextBreezeShiftAt) {
            const breezeOn = Math.random() < 0.67;
            breezeTarget = breezeOn ? rand(0.035, 0.12) : rand(0.0, 0.015);
            breezeTurbulence = breezeOn ? rand(0.01, 0.045) : rand(0.002, 0.012);
            breezeFreq = breezeOn ? rand(0.2, 0.65) : rand(0.08, 0.25);
            breezePhase = rand(0, TAU);
            nextBreezeShiftAt = elapsed + (breezeOn ? rand(1.8, 4.8) : rand(0.9, 2.8));
        }

        const response = breezeTarget > breezeStrength ? 0.75 : 0.38;
        const blend = 1 - Math.exp(-response * deltaTime);
        breezeStrength += (breezeTarget - breezeStrength) * blend;
    }

    function emitSmokePuff(kind = 'dark') {
        if (!smokeTexture) return;

        const origin = getPipeTipWorld();
        const isClick = kind === 'click';
        const isWisp = kind === 'wisp';
        const isDarkGroup = !isWisp;
        const count = isClick
            ? Math.floor(rand(14, 22))
            : isWisp
                ? Math.floor(rand(2, 5))
                : Math.floor(rand(4, 9));

        for (let i = 0; i < count; i++) {
            const baseColor = isWisp ? lightWispBaseColor : darkSmokeBaseColor;
            const spriteMaterial = new THREE.SpriteMaterial({
                map: smokeTexture,
                transparent: true,
                depthWrite: false,
                fog: !isWisp,
                color: isWisp
                    ? baseColor.clone().offsetHSL(rand(-0.007, 0.007), rand(-0.012, 0.015), rand(0.01, 0.1))
                    : baseColor.clone().offsetHSL(rand(-0.01, 0.01), rand(-0.02, 0.02), rand(-0.03, 0.02)),
                opacity: isWisp ? rand(0.12, 0.23) : isClick ? rand(0.32, 0.52) : rand(0.24, 0.42),
                blending: THREE.NormalBlending,
            });
            const sprite = new THREE.Sprite(spriteMaterial);
            const startScale = isWisp ? rand(0.03, 0.064) : isClick ? rand(0.14, 0.28) : rand(0.1, 0.22);
            sprite.scale.set(startScale, startScale, 1);
            sprite.position.set(
                origin.x + rand(-0.014, 0.018),
                origin.y + rand(-0.01, 0.015),
                origin.z - (isWisp ? rand(0.025, 0.08) : rand(0.05, 0.14))
            );
            sprite.renderOrder = 1;
            scene.add(sprite);

            smokeParticles.push({
                sprite,
                age: 0,
                life: isWisp ? rand(2.4, 4.8) : isClick ? rand(8.0, 13.5) : rand(7.0, 12.5),
                startScale,
                grow: isWisp ? rand(0.14, 0.34) : isClick ? rand(0.95, 1.9) : rand(0.75, 1.6),
                baseOpacity: spriteMaterial.opacity,
                vx: isWisp ? rand(-0.01, 0.011) : rand(-0.016, 0.012),
                vy: isWisp ? rand(0.016, 0.046) : rand(0.032, 0.072),
                vz: rand(-0.006, 0.006),
                rise: isWisp ? rand(0.032, 0.078) : rand(0.06, 0.12),
                leftDrift: isWisp ? rand(0.006, 0.02) : isClick ? rand(0.01, 0.03) : rand(0.009, 0.025),
                leftDriftGain: isWisp ? rand(0.016, 0.04) : rand(0.028, 0.065),
                drag: isWisp ? rand(0.24, 0.58) : rand(0.12, 0.36),
                jitterX: isWisp ? rand(0.018, 0.058) : rand(0.03, 0.1),
                jitterY: isWisp ? rand(0.008, 0.028) : rand(0.02, 0.06),
                wobbleXFreq: isWisp ? rand(0.7, 2.8) : rand(0.45, 1.5),
                wobbleYFreq: isWisp ? rand(0.8, 2.1) : rand(0.45, 1.3),
                wobbleZFreq: isWisp ? rand(0.6, 1.8) : rand(0.35, 1.0),
                phaseX: rand(0, TAU),
                phaseY: rand(0, TAU),
                phaseZ: rand(0, TAU),
                fadePower: isWisp ? rand(1.15, 1.55) : rand(0.9, 1.2),
                pulseAmp: isWisp ? 0.09 : 0.14,
                plumeBias: isDarkGroup ? rand(0.01, 0.04) : 0,
                breezeResponse: isWisp ? rand(0.7, 1.35) : rand(0.9, 1.7),
                gustPhase: rand(0, TAU),
            });
        }
    }

    function updateSmoke(deltaTime, elapsed) {
        const gustBase = Math.max(0, breezeStrength + Math.sin(elapsed * breezeFreq + breezePhase) * breezeTurbulence);
        for (let i = smokeParticles.length - 1; i >= 0; i--) {
            const p = smokeParticles[i];
            p.age += deltaTime;
            const t = p.age / p.life;
            if (t >= 1) {
                scene.remove(p.sprite);
                p.sprite.material.dispose();
                smokeParticles.splice(i, 1);
                continue;
            }

            const gustJitter = Math.sin(elapsed * (0.7 + p.wobbleXFreq * 0.55) + p.gustPhase) * 0.018;
            const gust = Math.max(0, gustBase + gustJitter) * p.breezeResponse;
            const leftAccel = p.leftDrift + p.leftDriftGain * t + gust;
            p.vx -= leftAccel * deltaTime;
            p.vy += (p.rise * (0.65 + 1.05 * t)) * deltaTime;
            if (p.plumeBias) p.vy += p.plumeBias * deltaTime;

            p.vx += Math.sin(elapsed * p.wobbleXFreq + p.phaseX) * p.jitterX * deltaTime;
            p.vy += Math.cos(elapsed * p.wobbleYFreq + p.phaseY) * p.jitterY * deltaTime;
            p.vz += Math.sin(elapsed * p.wobbleZFreq + p.phaseZ) * 0.012 * deltaTime;

            const drag = Math.exp(-p.drag * deltaTime);
            p.vx *= drag;
            p.vy *= drag;
            p.vz *= drag;

            p.sprite.position.x += p.vx * deltaTime;
            p.sprite.position.y += p.vy * deltaTime;
            p.sprite.position.z += p.vz * deltaTime;

            const scale = p.startScale + p.grow * (0.55 * t + t * t);
            p.sprite.scale.set(scale, scale, 1);
            const opacityPulse = 0.92 + Math.sin(elapsed * (0.9 + p.wobbleYFreq * 0.6) + p.phaseY) * p.pulseAmp;
            p.sprite.material.opacity = p.baseOpacity * Math.pow(1 - t, p.fadePower) * opacityPulse;
        }
    }

    document.addEventListener('click', () => {
        if (document.body.classList.contains('dark')) return;
        emitSmokePuff('click');
    });

    // ----- Clock -----
    const clock = new THREE.Clock();
    let previousElapsed = 0;

    // ----- Resize -----
    window.addEventListener('resize', () => {
        renderer.setSize(canvasW(), canvasH(), false);
        camera.aspect = canvasW() / canvasH();
        camera.updateProjectionMatrix();
    });

    // ----- Render loop (NO mouse parallax, NO scroll transform) -----
    function renderLight() {
        requestAnimationFrame(renderLight);

        if (document.body.classList.contains('dark') && !isTransitioningLight) {
            return;
        }

        const elapsed = clock.getElapsedTime();
        const deltaTime = Math.min(0.05, Math.max(0.001, elapsed - previousElapsed));
        previousElapsed = elapsed;

        // Cloud drift
        for (const c of clouds) {
            c.position.x += 0.00015;
            if (c.position.x > 12) c.position.x = -12;
        }

        // Inner-mountain fog drift — texture.offset.x scrolls each layer right
        // to left at its own rate so the haze between mountain ranges feels
        // alive instead of static. Subtle vertical bob + opacity breath are
        // kept on top of the scroll to add per-layer character.
        groundBlend.material.map.offset.x = elapsed * groundBlend.userData.scrollSpeed;
        groundBlend.position.y = -2.95 + Math.sin(elapsed * 0.17) * 0.045;
        groundBlend.material.opacity = 0.72 + Math.sin(elapsed * 0.22) * 0.08;
        groundBlendBack.material.map.offset.x = elapsed * groundBlendBack.userData.scrollSpeed;
        groundBlendBack.position.y = -2.80 + Math.sin(elapsed * 0.19 + 0.8) * 0.05;
        groundBlendBack.material.opacity = 0.42 + Math.sin(elapsed * 0.28 + 1.2) * 0.09;
        mistPlane.position.x = Math.sin(elapsed * 0.06 + 0.4) * 1.6;
        for (const wisp of mountainWisps) {
            const cfg = wisp.userData;
            wisp.material.map.offset.x = elapsed * cfg.scrollSpeed;
            wisp.position.y = cfg.y + Math.sin(elapsed * 0.16 + cfg.phase) * 0.08;
            wisp.material.opacity = cfg.opacity + Math.sin(elapsed * 0.24 + cfg.phase) * 0.08;
        }

        // Rolling mountain fog — scroll texture offset right-to-left per layer, with a
        // slow opacity breath and a tiny vertical bob so each bank feels alive and
        // independent rather than one synchronized wall of mist.
        for (const fog of rollingFogLayers) {
            const cfg = fog.userData;
            // Positive offset.x advances the UV sample window rightward through the
            // texture, which makes the fog content appear to drift LEFT on screen.
            fog.material.map.offset.x = elapsed * cfg.scrollSpeed;
            const pulse = Math.sin((elapsed * Math.PI * 2) / cfg.pulsePeriod + cfg.phase);
            fog.material.opacity = Math.max(0, cfg.opacity + pulse * cfg.pulseAmp);
            fog.position.y = cfg.y + Math.sin(elapsed * 0.09 + cfg.phase) * 0.05;
        }

        // Eye blink timing: clustered/jittery cadence (dark-mode-like),
        // with occasional doubles/triples.
        if (!eyeIsBlinking && elapsed >= nextEyeBlinkAt) {
            eyeIsBlinking = true;
            eyeBlinkTimer = 0;
            eyeBlinkGapTimer = 0;
            eyeBlinkGapDuration = rand(0.055, 0.14);
            const burstRoll = Math.random();
            eyeBlinkRepeatsRemaining = burstRoll < 0.08 ? 3 : burstRoll < 0.40 ? 2 : 1;
        }
        if (eyeIsBlinking) {
            if (eyeBlinkGapTimer > 0) {
                eyeBlinkGapTimer -= deltaTime;
                if (eyeBlinkGapTimer <= 0) eyeBlinkTimer = 0;
            } else {
                eyeBlinkTimer += deltaTime;
                const t = Math.min(eyeBlinkTimer / eyeBlinkDuration, 1.0);
                const closeAmount = Math.sin(t * Math.PI);
                eyeBlinkOpen = Math.max(eyeBlinkMinOpen, 1.0 - closeAmount);
                eyeBlinkIntensityMul = 0.52 + eyeBlinkOpen * 0.48;
                if (t >= 1.0) {
                    eyeBlinkRepeatsRemaining -= 1;
                    if (eyeBlinkRepeatsRemaining > 0) {
                        eyeBlinkGapTimer = eyeBlinkGapDuration;
                    } else {
                        eyeIsBlinking = false;
                        eyeBlinkOpen = 1.0;
                        eyeBlinkIntensityMul = 1.0;
                        scheduleNextEyeBlink(elapsed);
                    }
                }
            }
        } else {
            eyeBlinkOpen = 1.0;
            eyeBlinkIntensityMul = 1.0;
        }

        // Sauron searchlight cycle:
        // 1) one full circle sweep, 2) Gandalf lock (3s), 3) random scenic targeting.
        switch (beamState) {
            case BEAM_STATE.WAITING:
                currentOpacity = 0;
                if (elapsed >= 5.0) {
                    enterBeamState(BEAM_STATE.FULL_CIRCLE, elapsed);
                }
                break;

            case BEAM_STATE.FULL_CIRCLE: {
                beamStateTimer += deltaTime;
                const t = Math.min(beamStateTimer / fullCircleDuration, 1);
                beamYaw = fullCircleStartYaw + t * Math.PI * 2;
                beamPitch = Math.cos(elapsed * 0.55) * 0.06;
                const env = Math.min(1, beamStateTimer / activeFadeDuration);
                currentOpacity = env * MAX_OPACITY;
                if (t >= 1) {
                    beamYaw = normalizeAngle(beamYaw);
                    enterBeamState(BEAM_STATE.GANDALF_HOLD, elapsed);
                }
                break;
            }

            case BEAM_STATE.GANDALF_HOLD: {
                beamStateTimer += deltaTime;
                if (gandalfBeamTarget) {
                    const aim = directionToSweeperAngles(gandalfBeamTarget);
                    beamTargetYaw = aim.yaw + Math.sin(elapsed * 1.9) * 0.012;
                    beamTargetPitch = aim.pitch + Math.cos(elapsed * 1.6) * 0.008;
                    beamYaw = lerpAngle(beamYaw, beamTargetYaw, Math.min(1, deltaTime * 3.5));
                    beamPitch += (beamTargetPitch - beamPitch) * Math.min(1, deltaTime * 3.5);
                }
                currentOpacity = MAX_OPACITY;
                if (beamStateTimer >= gandalfHoldDuration) {
                    enterBeamState(BEAM_STATE.RANDOM_TARGETING, elapsed);
                }
                break;
            }

            case BEAM_STATE.RANDOM_TARGETING: {
                beamStateTimer += deltaTime;

                if (!isRandomTargetHolding) {
                    randomTargetMoveTimer += deltaTime;
                    const moveT = Math.min(randomTargetMoveTimer / randomTargetMoveDuration, 1);
                    const eased = moveT * moveT * (3 - 2 * moveT);
                    beamYaw = lerpAngle(randomTargetFromYaw, randomTargetToYaw, eased);
                    beamPitch = randomTargetFromPitch + (randomTargetToPitch - randomTargetFromPitch) * eased;
                    if (moveT >= 1) {
                        isRandomTargetHolding = true;
                        console.log('[beam-debug] stop random-move');
                        console.log('[beam-debug] start random-hold', Number(randomTargetHoldDuration.toFixed(2)), 's');
                    }
                } else {
                    randomTargetHoldTimer += deltaTime;
                    beamYaw = lerpAngle(beamYaw, randomTargetToYaw, Math.min(1, deltaTime * 4.0));
                    beamPitch += (randomTargetToPitch - beamPitch) * Math.min(1, deltaTime * 4.0);
                    if (randomTargetHoldTimer >= randomTargetHoldDuration) {
                        console.log('[beam-debug] stop random-hold');
                        startRandomTargetMove(elapsed);
                    }
                }

                let env = 1;
                if (beamStateTimer > randomPhaseDuration - activeFadeDuration) {
                    env = Math.max(0, (randomPhaseDuration - beamStateTimer) / activeFadeDuration);
                }
                currentOpacity = env * MAX_OPACITY;

                if (beamStateTimer >= randomPhaseDuration) {
                    enterBeamState(BEAM_STATE.COOLDOWN, elapsed);
                    currentOpacity = 0;
                }
                break;
            }

            case BEAM_STATE.COOLDOWN:
                beamStateTimer += deltaTime;
                currentOpacity = 0;
                if (beamStateTimer >= cooldownDuration) {
                    enterBeamState(BEAM_STATE.FULL_CIRCLE, elapsed);
                }
                break;
        }

        sauronBeamSweeper.rotation.y = beamYaw;
        sauronBeamSweeper.rotation.z = beamPitch;

        // Single shared material drives all blades.
        beamMaterial.opacity = currentOpacity;
        sauronBeamBlades.visible = currentOpacity > 0.001;

        const eyePulse = (Math.sin(elapsed * 0.8) + 1) * 0.5;
        const eyeOpacity = 0.7 + eyePulse * 0.3;
        eyeMat.opacity = eyeOpacity;
        eye.scale.y = eyeBaseScaleY * eyeBlinkOpen;
        emberLight.intensity = 1.9 * eyeOpacity * eyeBlinkIntensityMul;
        const eyeGlowPulse = (Math.sin(elapsed * 2.2 + 0.3) + 1) * 0.5;
        eyeGlow.material.opacity = (0.34 + eyeGlowPulse * 0.38) * eyeBlinkOpen;
        eyeGlow.scale.set(0.94 + eyeGlowPulse * 0.26, 0.34 + eyeGlowPulse * 0.11, 1);
        eyeCoreGlow.material.opacity = (0.20 + eyeGlowPulse * 0.28) * eyeBlinkOpen;
        eyeCoreGlow.scale.set(0.38 + eyeGlowPulse * 0.10, 0.15 + eyeGlowPulse * 0.05, 1);
        updateEyeFlame(deltaTime, elapsed);

        // Gandalf idle wind sway
        gandalf.position.y = gandalfBaseY + Math.sin(elapsed * 0.4) * 0.004;

        // Pipe smoke: constant light wisps + grouped dark plumes.
        if (nextDarkSmokeAt === 0) {
            queueNextDarkSmoke(elapsed + rand(1.2, 3.0));
        }
        if (nextWispAt === 0) {
            queueNextWisp(elapsed + rand(0.03, 0.16));
        }
        if (elapsed >= nextDarkSmokeAt) {
            emitSmokePuff('dark');
            queueNextDarkSmoke(elapsed);
        }
        if (elapsed >= nextWispAt) {
            emitSmokePuff('wisp');
            queueNextWisp(elapsed);
        }
        updateBreeze(elapsed, deltaTime);
        updateSmoke(deltaTime, elapsed);

        renderer.render(scene, camera);
    }
    renderLight();

    // ----- Expose hooks for toggle handler -----
    window._lightScene = {
        canvas, camera, fogOverlay,
        defaultCameraPos, defaultCameraTarget,
        baraddurPos,
        DEFAULT_FOV, ZOOM_FOV,
        get isTransitioning() { return isTransitioningLight; },
        set isTransitioning(v) { isTransitioningLight = v; },
        get isLightMode() { return isLightMode; },
        set isLightMode(v) { isLightMode = v; },
        snapToBaraddur() {
            camera.position.set(baraddurPos.x, baraddurPos.y + 0.5, baraddurPos.z + 1.5);
            camera.fov = ZOOM_FOV;
            camera.updateProjectionMatrix();
            camera.lookAt(baraddurPos.x, baraddurPos.y, baraddurPos.z);
        },
        snapToDefault() {
            camera.position.copy(defaultCameraPos);
            camera.fov = DEFAULT_FOV;
            camera.updateProjectionMatrix();
            camera.lookAt(defaultCameraTarget);
        },
    };
})();

// ============================================================================
// LIGHT↔DARK TOGGLE EXTENSION — capture-phase listener on the ring button.
// ============================================================================
(function attachLightToggle() {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', (e) => {
        const ls = window._lightScene;
        if (!ls || typeof gsap === 'undefined') return;

        if (ls.isTransitioning) {
            e.stopImmediatePropagation();
            return;
        }

        // Add flip animation
        const ringIcon = toggle.querySelector('.ring-icon');
        if (ringIcon) {
            toggle.classList.remove('flipping');
            void toggle.offsetWidth; // Trigger reflow
            toggle.classList.add('flipping');
            setTimeout(() => toggle.classList.remove('flipping'), 600);
        }

        const wasDark = document.body.classList.contains('dark');
        ls.isTransitioning = true;

        const fogEl = ls.fogOverlay;
        const cam = ls.camera;

        if (!wasDark) {
            // LIGHT → DARK
            gsap.to(cam.position, {
                x: ls.baraddurPos.x, y: ls.baraddurPos.y + 0.5, z: ls.baraddurPos.z + 1.5,
                duration: 1.8, ease: 'power2.in',
                onUpdate: () => cam.lookAt(ls.baraddurPos.x, ls.baraddurPos.y, ls.baraddurPos.z),
            });
            gsap.to(cam, {
                fov: ls.ZOOM_FOV, duration: 1.8, ease: 'power2.in',
                onUpdate: () => cam.updateProjectionMatrix(),
            });
            gsap.to(fogEl, { opacity: 1, duration: 0.9, ease: 'power2.in', delay: 1.0 });
            gsap.delayedCall(1.8, () => {
                document.body.classList.remove('light-mode');
                document.body.classList.add('dark');
                localStorage.setItem('theme', 'dark');
                ls.canvas.style.display = 'none';
                const sc = document.getElementById('sauron-canvas');
                if (sc) sc.style.opacity = '1';
                if (window._sauronForceEyeOpen) window._sauronForceEyeOpen(800);
            });
            gsap.to(fogEl, {
                opacity: 0, duration: 0.7, ease: 'power1.out', delay: 1.8,
                onComplete: () => { ls.isTransitioning = false; ls.isLightMode = false; ls.snapToDefault(); },
            });
            e.stopImmediatePropagation();
        } else {
            // DARK → LIGHT
            gsap.to(fogEl, { opacity: 1, duration: 0.6, ease: 'power2.in' });
            gsap.delayedCall(0.6, () => {
                document.body.classList.remove('dark');
                document.body.classList.add('light-mode');
                localStorage.setItem('theme', 'light');
                ls.canvas.style.display = 'block';
                const sc = document.getElementById('sauron-canvas');
                if (sc) sc.style.opacity = '0';
                ls.snapToBaraddur();
            });
            gsap.to(fogEl, {
                opacity: 0, duration: 1.4, ease: 'power1.out', delay: 0.6,
                onComplete: () => { ls.isTransitioning = false; ls.isLightMode = true; },
            });
            gsap.to(cam.position, {
                x: ls.defaultCameraPos.x, y: ls.defaultCameraPos.y, z: ls.defaultCameraPos.z,
                duration: 1.8, ease: 'power2.out', delay: 0.6,
                onUpdate: () => cam.lookAt(ls.defaultCameraTarget.x, ls.defaultCameraTarget.y, ls.defaultCameraTarget.z),
            });
            gsap.to(cam, {
                fov: ls.DEFAULT_FOV, duration: 1.8, ease: 'power2.out', delay: 0.6,
                onUpdate: () => cam.updateProjectionMatrix(),
            });
            e.stopImmediatePropagation();
        }
    }, { capture: true });
})();
