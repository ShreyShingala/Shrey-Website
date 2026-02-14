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
