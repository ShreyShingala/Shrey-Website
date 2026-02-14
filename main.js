// ============================================
// Theme Toggle (The One Ring)
// ============================================

const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

// Check for saved theme or default to system preference
const savedTheme = localStorage.getItem('theme');
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

if (savedTheme) {
    body.classList.toggle('dark', savedTheme === 'dark');
} else if (systemPrefersDark) {
    body.classList.add('dark');
}

themeToggle?.addEventListener('click', () => {
    body.classList.toggle('dark');
    localStorage.setItem('theme', body.classList.contains('dark') ? 'dark' : 'light');
});


// ============================================
//  EYE OF SAURON — Cinematic Canvas Engine
//  Full-viewport canvas with tower, eye,
//  fire particles, beam, and cursor glow
// ============================================

(function sauronEngine() {
    const canvas = document.getElementById('sauron-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // ---- State ----
    let W = 0, H = 0;
    let mouse = { x: -9999, y: -9999 };
    let smoothMouse = { x: -9999, y: -9999 };
    let particles = [];
    let embers = [];
    let blinkProgress = 0;
    let isBlinking = false;
    let dpr = 1;

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
    });
    document.addEventListener('mouseleave', () => {
        mouse.x = W / 2;
        mouse.y = H / 2;
    });

    // ---- Eye position ----
    function getEyePos() {
        return {
            x: W - TOWER_RIGHT_MARGIN - TOWER_WIDTH / 2,
            y: H * EYE_Y_RATIO
        };
    }

    // ================================================================
    //  TOWER — drawn directly onto canvas for perfect alignment
    // ================================================================
    function drawTower(ex, ey) {
        const tw = TOWER_WIDTH;
        const halfW = tw / 2;
        const towerTop = ey + 20;  // tower starts just below the eye
        const towerBot = H + 10;   // extends past viewport bottom

        ctx.save();

        // Tower body — trapezoidal, wider at base
        const topHalf = halfW * 0.35;
        const botHalf = halfW * 1.1;

        // Main tower gradient
        const tGrad = ctx.createLinearGradient(ex - botHalf, 0, ex + botHalf, 0);
        tGrad.addColorStop(0, '#080604');
        tGrad.addColorStop(0.3, '#12100d');
        tGrad.addColorStop(0.5, '#1a1714');
        tGrad.addColorStop(0.7, '#12100d');
        tGrad.addColorStop(1, '#080604');

        ctx.fillStyle = tGrad;
        ctx.beginPath();
        ctx.moveTo(ex - topHalf, towerTop);
        ctx.lineTo(ex + topHalf, towerTop);
        ctx.lineTo(ex + botHalf, towerBot);
        ctx.lineTo(ex - botHalf, towerBot);
        ctx.closePath();
        ctx.fill();

        // Tower crown / prongs around the eye
        const prongH = 45;
        const prongW = 5;
        const prongPositions = [-22, -14, -7, 7, 14, 22];
        ctx.fillStyle = '#0d0b09';
        for (const px of prongPositions) {
            ctx.beginPath();
            ctx.moveTo(ex + px - prongW, towerTop);
            ctx.lineTo(ex + px, towerTop - prongH - Math.abs(px) * 0.3);
            ctx.lineTo(ex + px + prongW, towerTop);
            ctx.closePath();
            ctx.fill();
        }

        // Central spire
        ctx.fillStyle = '#0a0806';
        ctx.beginPath();
        ctx.moveTo(ex - 4, towerTop - prongH);
        ctx.lineTo(ex, towerTop - prongH - 35);
        ctx.lineTo(ex + 4, towerTop - prongH);
        ctx.closePath();
        ctx.fill();

        // Battlements / ledges
        const ledgeYs = [0.35, 0.5, 0.65, 0.8];
        for (const ly of ledgeYs) {
            const ledgeY = towerTop + (towerBot - towerTop) * ly;
            const ledgeHalfW = topHalf + (botHalf - topHalf) * ly;
            ctx.strokeStyle = 'rgba(30, 25, 18, 0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(ex - ledgeHalfW - 3, ledgeY);
            ctx.lineTo(ex + ledgeHalfW + 3, ledgeY);
            ctx.stroke();
            // Small notches
            ctx.fillStyle = '#0d0b09';
            for (let n = -2; n <= 2; n++) {
                ctx.fillRect(ex + n * (ledgeHalfW * 0.4) - 2, ledgeY - 5, 4, 5);
            }
        }

        // Window slits with faint fire glow
        ctx.fillStyle = 'rgba(40, 15, 0, 0.5)';
        const windowYs = [0.25, 0.4, 0.55, 0.7, 0.85];
        for (const wy of windowYs) {
            const wy2 = towerTop + (towerBot - towerTop) * wy;
            const wHalfW = topHalf + (botHalf - topHalf) * wy;
            ctx.fillRect(ex - wHalfW * 0.3, wy2, 2.5, 7);
            ctx.fillRect(ex + wHalfW * 0.25, wy2 + 10, 2.5, 7);
        }

        // Vertical edge lines for depth
        ctx.strokeStyle = 'rgba(20, 16, 10, 0.3)';
        ctx.lineWidth = 0.5;
        for (let i = -1; i <= 1; i += 2) {
            ctx.beginPath();
            ctx.moveTo(ex + i * topHalf * 0.2, towerTop);
            ctx.lineTo(ex + i * botHalf * 0.2, towerBot);
            ctx.stroke();
        }

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
        const openness = 1 - blinkProgress;
        if (openness < 0.02) return;

        // Eye dimensions
        const eyeW = 70;
        const eyeH = 30 * openness;

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
        const slitH = (eyeH * 1.6 + Math.sin(time * 0.002) * 3) * openness;

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
        const dx = mouse.x - eyeX;
        const dy = mouse.y - eyeY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 50 || mouse.x < 0) return;

        const openness = 1 - blinkProgress;
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
        if (mouse.x < 0) return;
        const openness = 1 - blinkProgress;
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

        ctx.restore();
    }

    // ================================================================
    //  BLINK SYSTEM — driven by main render loop, not separate rAF
    // ================================================================
    let blinkStartTime = 0;
    const BLINK_CLOSE = 90, BLINK_HOLD = 70, BLINK_OPEN = 140;
    const BLINK_TOTAL = BLINK_CLOSE + BLINK_HOLD + BLINK_OPEN;

    function triggerBlink() {
        if (isBlinking) return;
        isBlinking = true;
        blinkStartTime = performance.now();
    }

    // Called every frame from render() to update blinkProgress
    function updateBlink() {
        if (!isBlinking) {
            blinkProgress = 0;
            return;
        }
        const t = performance.now() - blinkStartTime;
        if (t < BLINK_CLOSE) {
            blinkProgress = t / BLINK_CLOSE;
        } else if (t < BLINK_CLOSE + BLINK_HOLD) {
            blinkProgress = 1;
        } else if (t < BLINK_TOTAL) {
            blinkProgress = 1 - (t - BLINK_CLOSE - BLINK_HOLD) / BLINK_OPEN;
        } else {
            // Blink finished — guarantee clean state
            blinkProgress = 0;
            isBlinking = false;
        }
    }

    (function scheduleBlink() {
        setTimeout(() => {
            if (body.classList.contains('dark')) triggerBlink();
            scheduleBlink();
        }, 3000 + Math.random() * 5000);
    })();

    document.addEventListener('click', e => {
        if (!e.target.closest('#theme-toggle') && body.classList.contains('dark')) triggerBlink();
    });

    // ================================================================
    //  MAIN RENDER LOOP
    // ================================================================
    function render(time) {
        const isDark = body.classList.contains('dark');

        // Always update blink state — prevents stuck-closed eye
        updateBlink();

        ctx.clearRect(0, 0, W, H);

        if (!isDark) {
            particles = [];
            embers = [];
            requestAnimationFrame(render);
            return;
        }

        // Smooth mouse tracking (lagging softly behind real cursor)
        smoothMouse.x += (mouse.x - smoothMouse.x) * 0.1;
        smoothMouse.y += (mouse.y - smoothMouse.y) * 0.1;

        const eye = getEyePos();

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

        // Update & draw particles (behind the eye)
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
