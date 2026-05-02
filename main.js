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
        if (toggle) toggle.classList.add('precious-active');

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

        const angle = Math.atan2(dy, dx);
        const perpX = Math.sin(angle);
        const perpY = -Math.cos(angle);

        // Flickering intensity
        const flick = 0.06 + Math.sin(time * 0.005) * 0.025 + Math.sin(time * 0.013) * 0.015;
        const alpha = flick * openness;

        // Wide soft glow beam
        const glowW = 20 * openness;
        const glowGrad = ctx.createLinearGradient(eyeX, eyeY, smoothMouse.x, smoothMouse.y);
        glowGrad.addColorStop(0, `rgba(255, 100, 0, ${alpha * 0.5})`);
        glowGrad.addColorStop(0.4, `rgba(255, 60, 0, ${alpha * 0.2})`);
        glowGrad.addColorStop(1, 'rgba(255, 40, 0, 0)');

        ctx.beginPath();
        ctx.moveTo(eyeX + perpX * glowW, eyeY + perpY * glowW);
        ctx.lineTo(smoothMouse.x + perpX * 12, smoothMouse.y + perpY * 12);
        ctx.lineTo(smoothMouse.x - perpX * 12, smoothMouse.y - perpY * 12);
        ctx.lineTo(eyeX - perpX * glowW, eyeY - perpY * glowW);
        ctx.closePath();
        ctx.fillStyle = glowGrad;
        ctx.fill();

        // Narrow bright core beam
        const coreW = 5 * openness;
        const coreGrad = ctx.createLinearGradient(eyeX, eyeY, smoothMouse.x, smoothMouse.y);
        coreGrad.addColorStop(0, `rgba(255, 160, 40, ${alpha * 1.8})`);
        coreGrad.addColorStop(0.3, `rgba(255, 100, 0, ${alpha * 1.0})`);
        coreGrad.addColorStop(1, 'rgba(255, 80, 0, 0)');

        ctx.beginPath();
        ctx.moveTo(eyeX + perpX * coreW, eyeY + perpY * coreW);
        ctx.lineTo(smoothMouse.x + perpX * 2, smoothMouse.y + perpY * 2);
        ctx.lineTo(smoothMouse.x - perpX * 2, smoothMouse.y - perpY * 2);
        ctx.lineTo(eyeX - perpX * coreW, eyeY - perpY * coreW);
        ctx.closePath();
        ctx.fillStyle = coreGrad;
        ctx.fill();

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
    renderer.setClearColor(0xc8d0dc, 1);

    // ----- Scene with exponential fog -----
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xc8d0dc, 0.085);

    // ----- Camera — Gandalf left foreground, mountains cascade right, tower far right -----
    const DEFAULT_FOV = 50;
    const ZOOM_FOV = 75;
    const camera = new THREE.PerspectiveCamera(DEFAULT_FOV, canvasW() / canvasH(), 0.01, 80);
    const defaultCameraPos = new THREE.Vector3(0, 0.9, 5.5);
    const defaultCameraTarget = new THREE.Vector3(0.8, 0.3, -6);
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
        uniforms: {},
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec2 vUv;
            void main() {
                float y = vUv.y;
                float x = vUv.x;
                // Vertical: warm low band → soft blue mid → cooler high
                vec3 warmLow   = vec3(0.941, 0.752, 0.439); // #f0c070
                vec3 softBlue  = vec3(0.627, 0.722, 0.816); // #a0b8d0
                vec3 highBlue  = vec3(0.486, 0.580, 0.690);
                vec3 stormy    = vec3(0.227, 0.125, 0.188); // #3a2030 — corrupted Mordor sky
                vec3 base;
                if (y < 0.35) {
                    base = mix(warmLow, softBlue, y / 0.35);
                } else {
                    base = mix(softBlue, highBlue, (y - 0.35) / 0.65);
                }
                // Left 40% bias toward warm dawn gold-peach
                float leftWarm = smoothstep(0.40, 0.0, x);
                base = mix(base, warmLow, leftWarm * 0.55);
                // Right 40% bias toward dark stormy Mordor
                float rightDark = smoothstep(0.60, 1.0, x);
                base = mix(base, stormy, rightDark * 0.85);
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

    // Sun disc + halo removed entirely.

    // ----- Inline seeded noise -----
    function seededNoise(x, seed) {
        return Math.sin(x * 2.3 + seed) * 0.5
             + Math.sin(x * 5.1 + seed * 1.7) * 0.25
             + Math.sin(x * 11.7 + seed * 0.3) * 0.12;
    }

    // Soft rolling profile — fewer, gentler peaks so layers don't compete visually
    function ridgedNoise(x, seed) {
        const base = seededNoise(x, seed);
        const ridge = (1 - Math.abs(Math.sin(x * 1.6 + seed * 2.1))) * 0.35;
        return base * 0.85 + ridge;
    }

    // ----- Mountains — 3 calm layered ranges, smooth/non-jagged, with snow caps -----
    const SEGMENTS = 160;
    const HEIGHT_SEG = 10;
    // Horizontal gradient: left=cool/bright, right=dark warm bleeding toward Mordor reddish-brown.
    const mordorWarm = new THREE.Color('#5a4a4a');
    const mordorDeep = new THREE.Color('#4a3030');
    const layerSpecs = [
        // Range 1 — farthest, palest, broadest, white snow peaks (background alps)
        { z: -9, color: '#eef2f4', snow: true, capCount: 5, opacity: 0.8, seed: 11, y: -0.4, peakScale: 1.9, w: 40, freq: 2.4 },
        // Range 2 — middle, medium grey-blue, 3–4 snow caps
        { z: -5.5, color: '#9aafc0', snow: true, capCount: 4, opacity: 0.92, seed: 23, y: -0.35, peakScale: 2.2, w: 28, freq: 2.6 },
        // Range 3 — closest, darker grey-blue, taller (pushed back so the grassy plain has room)
        { z: -6, color: '#6a8090', snow: true, capCount: 2, opacity: 1.0, seed: 37, y: -0.3, peakScale: 2.8, w: 22, freq: 2.0 },
    ];

    // Storage for nearest layer (index 2) heights so we can place Gandalf on its ridge if needed
    let gandalfLayerHeights = [];
    // Snow-cap meshes per layer — built after each mountain so they sit exactly on the tallest peaks
    const snowCapGeo = new THREE.SphereGeometry(0.06, 10, 6);
    const snowCapMat = new THREE.MeshBasicMaterial({ color: 0xf0f4f8, fog: false });

    const mountainMeshes = layerSpecs.map((spec, layerIdx) => {
        const geo = new THREE.PlaneGeometry(spec.w, 5, SEGMENTS, HEIGHT_SEG);
        const pos = geo.attributes.position;
        const colors = new Float32Array(pos.count * 3);
        const topYs = [];

        // Per-layer base color blended L→R toward mordor tones using world x.
        // Compute the overall world-x range we want to span for the gradient — use sky width as reference.
        const GRADIENT_LEFT = -10;
        const GRADIENT_RIGHT = 10;
        const baseColor = new THREE.Color(spec.color);

        function colorAtWorldX(wx) {
            const t = Math.max(0, Math.min(1, (wx - GRADIENT_LEFT) / (GRADIENT_RIGHT - GRADIENT_LEFT)));
            // 0..0.5 keep base; 0.5..0.8 lerp to mordorWarm; 0.8..1 lerp to mordorDeep
            const c = baseColor.clone();
            if (t > 0.5) {
                const warmT = Math.min(1, (t - 0.5) / 0.3);
                c.lerp(mordorWarm, warmT * 0.55);
            }
            if (t > 0.8) {
                const deepT = Math.min(1, (t - 0.8) / 0.2);
                c.lerp(mordorDeep, deepT * 0.55);
            }
            // Slightly brighter on the far left for the lit/hopeful side
            if (t < 0.35) {
                const liftT = (0.35 - t) / 0.35;
                c.r = Math.min(1, c.r + liftT * 0.04);
                c.g = Math.min(1, c.g + liftT * 0.04);
                c.b = Math.min(1, c.b + liftT * 0.04);
            }
            return c;
        }

        // Precompute peak height per unique x
        const peakAt = new Map();
        const peakOf = (x) => {
            if (peakAt.has(x)) return peakAt.get(x);
            const nx = (x + spec.w / 2) / spec.w;
            const h = ridgedNoise(nx * spec.freq, spec.seed) * spec.peakScale;
            peakAt.set(x, h);
            return h;
        };

        const BOTTOM = -3.5;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i);
            const peak = peakOf(x);

            const t = (y + 2.5) / 5; // 0 at bottom, 1 at top
            const newY = BOTTOM + t * (peak - BOTTOM);
            pos.setY(i, newY);

            // World x for the gradient is just `x` since mesh position x = 0
            const c = colorAtWorldX(x);
            colors[i * 3]     = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;

            if (Math.abs(t - 1) < 0.001) {
                topYs.push({ x, y: newY });
            }
        }
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geo.computeVertexNormals();

        const mat = new THREE.MeshLambertMaterial({
            vertexColors: true,
            transparent: true,
            opacity: spec.opacity,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(0, spec.y, spec.z);
        scene.add(mesh);

        // Snow-cap domes removed for now — to revisit alongside the mountain styling pass.

        if (layerIdx === 2) {
            gandalfLayerHeights = topYs.sort((a, b) => a.x - b.x);
        }
        return mesh;
    });

    // ----- Grassy plain — sits BEHIND the cliff so the cliff face can plunge down freely -----
    // Forward edge at z=-5 (just past the cliff face area), back edge stretches to mountains.
    const valleyGeo = new THREE.PlaneGeometry(280, 60, 1, 1);
    const valleyMat = new THREE.MeshLambertMaterial({
        color: new THREE.Color('#5a5e5a'),
        transparent: false,
    });
    const valley = new THREE.Mesh(valleyGeo, valleyMat);
    valley.rotation.x = -Math.PI / 2;
    valley.position.set(0, -2.4, -35);
    scene.add(valley);

    // Subtle horizontal mist layer hovering over the valley — adds cold, distant feel
    function makeValleyMistTexture() {
        const c = document.createElement('canvas');
        c.width = 1024; c.height = 128;
        const g = c.getContext('2d');
        const grad = g.createLinearGradient(0, 0, 0, 128);
        grad.addColorStop(0,    'rgba(255,255,255,0.0)');
        grad.addColorStop(0.45, 'rgba(255,255,255,0.55)');
        grad.addColorStop(0.55, 'rgba(255,255,255,0.55)');
        grad.addColorStop(1,    'rgba(255,255,255,0.0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, 1024, 128);
        // Add some soft horizontal blobs for variation
        for (let i = 0; i < 6; i++) {
            const cx = 100 + (i / 6) * 824;
            const r = 90 + (i % 3) * 30;
            const rg = g.createRadialGradient(cx, 64, 4, cx, 64, r);
            rg.addColorStop(0, 'rgba(255,255,255,0.18)');
            rg.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = rg;
            g.fillRect(0, 0, 1024, 128);
        }
        const tex = new THREE.CanvasTexture(c);
        tex.needsUpdate = true;
        return tex;
    }
    // Valley mist plane removed — was floating as an oval like the others.
    void makeValleyMistTexture;

    // ----- Snowy mountain top we're standing on — plateau extends across left + bottom -----
    // The white plateau extends FAR left and FAR toward the camera (off-screen on those
    // sides) so the entire left + bottom of the frame reads as smooth snowy ground beneath
    // the viewer. The rocky cliff face is only a small region just to Gandalf's right where
    // the plateau drops to reveal the grass valley below.
    const cliffGeo = new THREE.PlaneGeometry(30, 24, 200, 160);
    {
        const pos = cliffGeo.attributes.position;
        const colors = new Float32Array(pos.count * 3);
        const cornice  = new THREE.Color('#e8eef0');
        const rockMid  = new THREE.Color('#3a4250');
        const rockDeep = new THREE.Color('#1c2028');
        const PEAK_RISE  = 4.7;
        const OUTER_DROP = -8.0;     // → world Y = -13.78, cliff face plunges all the way down

        // Plateau half-extents and falloff widths (asymmetric).
        // The visible cliff face is only on the right just past Gandalf — every other
        // side extends far enough that the plane edges are off-screen.
        const HX_RIGHT_BASE = 0.9, FX_RIGHT = 1.6;  // visible rocky face, near-vertical end
        const HX_LEFT  = 12.0, FX_LEFT  = 2.5;       // plateau extends way left, off-screen
        const HY_BACK  = 3.2, FY_BACK  = 1.2;        // back drop also goes near-vertical
        const HY_FRONT = 9.0, FY_FRONT = 2.5;        // plateau extends way to camera, off-screen

        for (let i = 0; i < pos.count; i++) {
            const lx = pos.getX(i);
            const ly = pos.getY(i);
            const dx = lx;
            const dy = ly - 0.5;

            // Right edge undulates as we sweep through dy: out → in → out → tapers down.
            // Sine wave along depth gives a smooth backwards-S shape to the right boundary.
            const rightWave = Math.sin((dy + 0.4) * 3.0) * 0.55;
            const HX_RIGHT = HX_RIGHT_BASE + rightWave;

            const HX = dx > 0 ? HX_RIGHT : HX_LEFT;
            const FX = dx > 0 ? FX_RIGHT : FX_LEFT;
            const HY = dy > 0 ? HY_BACK  : HY_FRONT;
            const FY = dy > 0 ? FY_BACK  : FY_FRONT;

            // Normalized distance beyond the plateau edge (0 inside plateau, 1 at falloff end)
            const ax = Math.max(0, (Math.abs(dx) - HX) / FX);
            const ay = Math.max(0, (Math.abs(dy) - HY) / FY);
            const distOut = Math.sqrt(ax * ax + ay * ay);

            // Bell: flat 1 inside plateau, smoothstep down to 0 at distOut=1
            let bell;
            if (distOut <= 0)        bell = 1;
            else if (distOut >= 1)   bell = 0;
            else                     bell = 1 - (distOut * distOut * (3 - 2 * distOut));

            // Subtle fluctuations on the cliff face (mid-bell band only)
            const cliffBand = Math.exp(-Math.pow((bell - 0.55) * 3.2, 2));
            const fluctuation = (
                  Math.sin(lx * 4.3 + ly * 2.1) * 0.32
                + Math.sin(ly * 5.9 - lx * 3.1) * 0.20
                + Math.sin(lx * 8.7 - ly * 4.0) * 0.10
            ) * cliffBand;

            const h = OUTER_DROP + (PEAK_RISE - OUTER_DROP) * bell + fluctuation;
            pos.setZ(i, h);

            const t = 1 - bell;
            const c = cornice.clone()
                .lerp(rockMid,  Math.min(1, t * 1.7))
                .lerp(rockDeep, Math.max(0, (t - 0.5) / 0.5) * 0.85);
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
    const cliff = new THREE.Mesh(cliffGeo, cliffMat);
    cliff.rotation.x = -Math.PI / 2;
    // Plateau (h = PEAK_RISE = 4.7) sits at world Y = -5.78 + 4.7 = -1.08 — Gandalf's feet.
    cliff.position.set(-2.6, -5.78, -2.0);
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

    // ----- Clouds (3 clouds in top portion) -----
    function makeCloudTexture(seed) {
        const c = document.createElement('canvas');
        c.width = 512; c.height = 256;
        const g = c.getContext('2d');
        const blobCount = 6 + Math.floor(Math.abs(Math.sin(seed * 7.3)) * 3);
        for (let i = 0; i < blobCount; i++) {
            const cx = 60 + (Math.sin(i * 3.7 + seed) * 0.5 + 0.5) * 392;
            const cy = 80 + (Math.sin(i * 5.1 + seed * 2.3) * 0.5 + 0.5) * 96;
            const rx = 50 + (Math.sin(i * 2.1 + seed * 1.3) * 0.5 + 0.5) * 70;
            const ry = rx * (0.4 + Math.sin(i * 4.7 + seed) * 0.15);
            const grad = g.createRadialGradient(cx, cy, 4, cx, cy, rx);
            const warmth = cx / 512;
            grad.addColorStop(0, `rgba(255,${250 + warmth * 5},${240 + warmth * 10},0.25)`);
            grad.addColorStop(0.6, `rgba(255,${250 + warmth * 5},${240 + warmth * 10},0.08)`);
            grad.addColorStop(1, `rgba(255,255,250,0)`);
            g.fillStyle = grad;
            g.beginPath();
            g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            g.fill();
        }
        const tex = new THREE.CanvasTexture(c);
        tex.needsUpdate = true;
        return tex;
    }

    const clouds = [];
    const cloudConfigs = [
        { seed: 3,  x: -2, y: 4.5, z: -12, w: 6, h: 2, opacity: 0.5 },
        { seed: 17, x: 3,  y: 5.0, z: -14, w: 7, h: 2.2, opacity: 0.4 },
        { seed: 41, x: 7,  y: 4.0, z: -10, w: 5, h: 1.5, opacity: 0.45 },
    ];
    for (const cc of cloudConfigs) {
        const tex = makeCloudTexture(cc.seed);
        const mat = new THREE.MeshBasicMaterial({
            map: tex, transparent: true, opacity: cc.opacity, depthWrite: false, fog: false,
        });
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(cc.w, cc.h), mat);
        plane.position.set(cc.x, cc.y, cc.z);
        clouds.push(plane);
        scene.add(plane);
    }

    // ----- Barad-dûr — sits on the mountains on the right. MeshBasicMaterial = unlit, always dark.
    // Position lowered so the base nestles into the mid-range peaks instead of floating in sky.
    const baraddurPos = { x: 5.0, y: 0.4, z: -8.5 };
    const baraddurScale = 0.83;
    const baraddur = new THREE.Group();
    // Each part gets its OWN MeshBasicMaterial — fully ignores all scene lighting.
    const towerColor = 0x1a1010;
    const newDarkMat = () => new THREE.MeshBasicMaterial({ color: towerColor });

    const tBase = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.85, 8), newDarkMat());
    tBase.position.y = 0.425;
    baraddur.add(tBase);
    const tMid = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.30, 0.95, 8), newDarkMat());
    tMid.position.y = 1.32;
    baraddur.add(tMid);
    const tUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.7, 8), newDarkMat());
    tUpper.position.y = 2.14;
    baraddur.add(tUpper);
    const tCrownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 8), newDarkMat());
    tCrownBase.position.y = 2.55;
    baraddur.add(tCrownBase);

    const prongCount = 4;
    for (let i = 0; i < prongCount; i++) {
        const a = (i / prongCount) * Math.PI * 2 + 0.4;
        const prong = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.32, 4), newDarkMat());
        prong.position.set(Math.cos(a) * 0.13, 2.77, Math.sin(a) * 0.13);
        baraddur.add(prong);
    }

    const tSpire = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.55, 6), newDarkMat());
    tSpire.position.y = 2.95;
    baraddur.add(tSpire);

    // Ember at the tip — tight 1.2 distance so it doesn't paint the whole tower red
    const emberLight = new THREE.PointLight(0xff2200, 2.0, 1.2);
    emberLight.position.y = 2.95;
    baraddur.add(emberLight);

    baraddur.position.set(baraddurPos.x, baraddurPos.y, baraddurPos.z);
    baraddur.scale.setScalar(baraddurScale);
    scene.add(baraddur);

    // Red atmospheric haze — wide soft sprite behind/around the tower
    function makeRedHazeTexture() {
        const c = document.createElement('canvas');
        c.width = 256; c.height = 256;
        const g = c.getContext('2d');
        const grad = g.createRadialGradient(128, 128, 8, 128, 128, 124);
        grad.addColorStop(0,    'rgba(120,20,10,0.30)'); // Mordor atmosphere, dark red
        grad.addColorStop(0.45, 'rgba(110,18,8,0.16)');
        grad.addColorStop(0.8,  'rgba(95,15,5,0.04)');
        grad.addColorStop(1,    'rgba(80,12,5,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, 256, 256);
        const tex = new THREE.CanvasTexture(c);
        tex.needsUpdate = true;
        return tex;
    }
    const redHazeMat = new THREE.MeshBasicMaterial({
        map: makeRedHazeTexture(),
        transparent: true, opacity: 0.85, depthWrite: false, fog: false,
    });
    const redHaze = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), redHazeMat);
    redHaze.position.set(baraddurPos.x, baraddurPos.y + 1.5, baraddurPos.z - 0.3);
    redHaze.renderOrder = 0;
    scene.add(redHaze);

    // ----- Gandalf billboard — left foreground, standing on the cliff edge -----
    const gandalfTexture = new THREE.TextureLoader().load('Images/gandalf.png');
    // Scale up by ~1.35x from the previous 1.1 × 1.45
    const gandalfW = 1.485;
    const gandalfH = 1.9575;
    const gandalfGeo = new THREE.PlaneGeometry(gandalfW, gandalfH);
    const gandalfMat = new THREE.MeshBasicMaterial({
        map: gandalfTexture,
        transparent: true,
        alphaTest: 0.1,
        depthWrite: false,
        side: THREE.DoubleSide,
    });
    const gandalf = new THREE.Mesh(gandalfGeo, gandalfMat);

    // Position: shifted left by 0.6 and down by 0.3 from the previous (-2.0, 0.2)
    const gandalfX = -2.6;
    const gandalfZ = -2.5;
    const gandalfWorldY = -0.1;
    const gandalfBaseY = gandalfWorldY;
    gandalf.position.set(gandalfX, gandalfWorldY, gandalfZ);
    gandalf.rotation.y = 0.0; // facing right toward the tower (back of cloak to camera)
    scene.add(gandalf);

    // ----- Clock -----
    const clock = new THREE.Clock();

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

        // Cloud drift
        for (const c of clouds) {
            c.position.x += 0.00015;
            if (c.position.x > 12) c.position.x = -12;
        }

        // Gandalf idle wind sway
        gandalf.position.y = gandalfBaseY + Math.sin(elapsed * 0.4) * 0.004;

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
