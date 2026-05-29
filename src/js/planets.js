export function initPlanets({
    canvasId = "planetsCanvas",
    tipId = "planetsTip",
    containerId = null,
    planetsDef = null,
    onSelect = null,
    autoPan = true,
    autoPanSpeed = 16,
} = {}) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext("2d");
    const tip = document.getElementById(tipId);

    const container = containerId
        ? document.getElementById(containerId)
        : canvas.parentElement; // planets-block

    let w = 0, h = 0, dpr = 1;

    // When planets don't fit, we render them in a wider "world" and pan a camera.
    // All drawing happens in viewport coords: (worldX - cameraX).
    let worldW = 0;
    let cameraX = 0;
    let targetCameraX = 0;

    // UI: side arrows for panning (created on demand)
    let navEl = null;
    let navPrev = null;
    let navNext = null;

    // Drag-to-pan
    let isPanning = false;
    let panStartX = 0;
    let camStartX = 0;
    let panMoved = 0;
    let suppressClickUntil = 0;
    let autoPanDir = 1;
    let autoPanPauseUntil = performance.now() + 1400;
    let motionPaused = false;
    let activeCategory = "All";

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const EDGE_SAFE_ZONE = 78;
    const maxCameraX = () => Math.max(0, worldW - w);

    function setCameraTarget(x, immediate = false) {
        targetCameraX = clamp(x, 0, maxCameraX());
        if (immediate) cameraX = targetCameraX;
        syncNavState();
    }

    let needsRelayout = true;

    function resize() {
        dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

        const rect = canvas.getBoundingClientRect();
        w = rect.width;
        h = rect.height;

        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        needsRelayout = true;
    }
    window.addEventListener("resize", resize);
    resize();

    function pauseAutoPan(ms = 2200) {
        autoPanPauseUntil = performance.now() + ms;
    }

    function setMotionPaused(paused) {
        motionPaused = paused;
        if (motionPaused) {
            targetCameraX = cameraX;
            isPanning = false;
        } else {
            pauseAutoPan(1200);
        }
        syncNavState();
    }

    const rand = (min, max) => Math.random() * (max - min) + min;

    // Mouse
    const mouse = { x: 0, y: 0, active: false };

    canvas.addEventListener("mousemove", (e) => {
        const r = canvas.getBoundingClientRect();
        mouse.active = true;
        mouse.x = e.clientX - r.left;
        mouse.y = e.clientY - r.top;

        // tooltip uses viewport coords (fixed), so keep clientX/clientY
        tip.style.left = e.clientX + "px";
        tip.style.top = e.clientY + "px";
    });

    canvas.addEventListener("mouseleave", () => {
        mouse.active = false;
        tip.classList.remove("show");
        pauseAutoPan(900);
    });


    // ===== Sketch helpers =====
    function roughCircle(x, y, r, passes = 2, jitter = 1.2) {
        for (let p = 0; p < passes; p++) {
            const steps = 64;
            ctx.beginPath();
            for (let i = 0; i <= steps; i++) {
                const a = (i / steps) * Math.PI * 2;
                const rr = r + rand(-jitter, jitter);
                const px = x + Math.cos(a) * rr + rand(-0.35, 0.35);
                const py = y + Math.sin(a) * rr + rand(-0.35, 0.35);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
    }

    function roughEllipse(x, y, rx, ry, rot = 0, passes = 2, jitter = 1.1) {
        for (let p = 0; p < passes; p++) {
            const steps = 80;
            ctx.beginPath();
            for (let i = 0; i <= steps; i++) {
                const a = (i / steps) * Math.PI * 2;
                const jx = rand(-jitter, jitter);
                const jy = rand(-jitter, jitter);
                let px = Math.cos(a) * (rx + jx);
                let py = Math.sin(a) * (ry + jy);
                const cr = Math.cos(rot), sr = Math.sin(rot);
                const rpx = px * cr - py * sr;
                const rpy = px * sr + py * cr;
                if (i === 0) ctx.moveTo(x + rpx, y + rpy);
                else ctx.lineTo(x + rpx, y + rpy);
            }
            ctx.stroke();
        }
    }

    function hatchInCircle(x, y, r, angleRad, spacing, alpha, wiggle = 0.9) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r - 0.5, 0, Math.PI * 2);
        ctx.clip();
        ctx.globalAlpha = alpha;

        ctx.translate(x, y);
        ctx.rotate(angleRad);

        const len = r * 2.9;
        for (let i = -len; i <= len; i += spacing) {
            ctx.beginPath();
            const j = rand(-wiggle, wiggle);
            ctx.moveTo(-len, i + j);
            ctx.lineTo(len, i + j + rand(-0.6, 0.6));
            ctx.stroke();
        }

        ctx.restore();
        ctx.globalAlpha = 1;
    }

    function stippleInCircle(x, y, r, density, alpha) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r - 1, 0, Math.PI * 2);
        ctx.clip();
        ctx.globalAlpha = alpha;

        const area = Math.PI * r * r;
        const n = Math.floor(area * density);
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2;
            const rr = Math.sqrt(Math.random()) * (r - 1);
            const px = x + Math.cos(a) * rr;
            const py = y + Math.sin(a) * rr;
            const pr = rand(0.35, 1.1);
            ctx.beginPath();
            ctx.arc(px, py, pr, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
        ctx.globalAlpha = 1;
    }

    function cratersInCircle(x, y, r, count, alpha) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r - 1, 0, Math.PI * 2);
        ctx.clip();

        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 1;

        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const rr = Math.sqrt(Math.random()) * (r * 0.72);
            const cx = x + Math.cos(a) * rr;
            const cy = y + Math.sin(a) * rr;
            const cr = rand(r * 0.06, r * 0.14);

            ctx.beginPath();
            ctx.arc(cx, cy, cr, rand(0, Math.PI), rand(Math.PI, Math.PI * 2));
            ctx.stroke();

            ctx.globalAlpha = 0.55;
            ctx.beginPath();
            ctx.arc(
                cx + rand(-0.6, 0.6),
                cy + rand(-0.6, 0.6),
                cr * rand(0.9, 1.15),
                rand(0, Math.PI),
                rand(Math.PI, Math.PI * 2),
            );
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }

    function halfShadowHatch(x, y, r, side, angle, spacing, alpha) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r - 1, 0, Math.PI * 2);
        ctx.clip();

        ctx.beginPath();
        if (side < 0) ctx.rect(-99999, -99999, x, 999999);
        else ctx.rect(x, -99999, 999999, 999999);
        ctx.clip();

        ctx.strokeStyle = "rgba(255,255,255,1)";
        hatchInCircle(x, y, r, angle, spacing, alpha, 0.8);

        ctx.restore();
    }

    function chalkHalo(x, y, r, strength) {
        ctx.save();
        ctx.globalAlpha = strength;
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(x, y, r + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    // NOTE: in your “inject” use-case, you probably DON'T want planets.js to clear the background.
    // So we do NOT fillRect() the whole screen here. We only draw planets.
    // Your starfield stays visible behind.

    // ===== Planets def =====
    const PLANETS_DEF = planetsDef ?? [
        { name: "Marble", x: 0.16, y: 0.52, r: 26, ring: false, look: { type: "marble", outline: 2.4, jitter: 1.2, passes: 2, hatchAlpha: 0.55 } },
        { name: "Crater", x: 0.29, y: 0.52, r: 56, ring: false, look: { type: "crater", outline: 3.2, jitter: 1.4, passes: 2, craterCount: 7 } },
        { name: "Split", x: 0.42, y: 0.52, r: 34, ring: false, look: { type: "split", outline: 2.6, jitter: 1.2, passes: 2, shadowSide: +1 } },
        { name: "Belted", x: 0.54, y: 0.52, r: 40, ring: false, look: { type: "belt", outline: 2.8, jitter: 1.8, passes: 2, beltCount: 2 } },
        { name: "Halo", x: 0.67, y: 0.52, r: 84, ring: false, look: { type: "halo", outline: 3.6, jitter: 1.1, passes: 2, halo: 0.9 } },
        { name: "Ringed", x: 0.80, y: 0.52, r: 52, ring: true, look: { type: "ringed", outline: 2.8, jitter: 1.2, passes: 2, ringWidth: 2.8, ringDouble: true } },
        { name: "Dotted", x: 0.92, y: 0.52, r: 46, ring: false, look: { type: "dots", outline: 2.2, jitter: 1.5, passes: 2, dotDensity: 0.016 } },
    ];

    const planets = PLANETS_DEF.map((p, i) => ({
        id: i + 1,
        name: p.name,
        category: p.category ?? "",
        // "preferred" normalized positions (optional)
        nx: typeof p.x === "number" ? p.x : null,
        ny: typeof p.y === "number" ? p.y : null,

        // world-space base position (computed)
        wx: 0,
        wy: 0,
        r: p.r,
        ring: p.ring,
        look: p.look,
        hover: 0,
        pulse: 0,
        phase: rand(0, Math.PI * 2),
        layoutYOffset: rand(-18, 18),
        bobSpeed: rand(0.6, 1.1),
        bobAmp: rand(4, 10),
        ringRot: rand(-0.25, 0.25),
    }));

    function visiblePlanets() {
        if (activeCategory === "All") return planets;
        return planets.filter((p) => p.category === activeCategory);
    }

    // ===== Layout (non-colliding) + camera panning =====
    function ensureNav() {
        if (navEl) return;
        navEl = document.createElement("div");
        navEl.className = "planets-nav";
        navEl.innerHTML = `
          <button class="planets-nav__btn planets-nav__btn--left" type="button" aria-label="Scroll left">‹</button>
          <button class="planets-nav__btn planets-nav__btn--right" type="button" aria-label="Scroll right">›</button>
        `;
        container.appendChild(navEl);
        navPrev = navEl.querySelector(".planets-nav__btn--left");
        navNext = navEl.querySelector(".planets-nav__btn--right");

        const step = () => Math.max(240, w * 0.75);

        navPrev.addEventListener("click", () => {
            pauseAutoPan(3200);
            setCameraTarget(targetCameraX - step());
        });
        navNext.addEventListener("click", () => {
            pauseAutoPan(3200);
            setCameraTarget(targetCameraX + step());
        });

        // wheel-to-pan (trackpads will feel natural)
        canvas.addEventListener(
            "wheel",
            (e) => {
                if (worldW <= w + 1) return;
                // Prefer horizontal wheel; fallback to vertical wheel.
                const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
                if (delta === 0) return;
                pauseAutoPan(3200);
                setCameraTarget(targetCameraX + delta);
                e.preventDefault();
            },
            { passive: false }
        );

        // drag-to-pan
        canvas.addEventListener("mousedown", (e) => {
            if (worldW <= w + 1) return;
            pauseAutoPan(3200);
            isPanning = true;
            panStartX = e.clientX;
            camStartX = targetCameraX;
            panMoved = 0;
        });
        window.addEventListener("mouseup", () => {
            if (isPanning && panMoved > 6) suppressClickUntil = performance.now() + 200;
            isPanning = false;
        });
        window.addEventListener("mousemove", (e) => {
            if (!isPanning) return;
            const dx = e.clientX - panStartX;
            panMoved = Math.max(panMoved, Math.abs(dx));
            setCameraTarget(camStartX - dx, true);
            pauseAutoPan(1400);
        });
    }

    function syncNavState() {
        if (!navEl) return;
        const overflow = worldW > w + 1;
        navEl.classList.toggle("is-visible", overflow);
        if (!overflow) return;
        const maxCam = maxCameraX();
        navPrev.disabled = targetCameraX <= 0.5;
        navNext.disabled = targetCameraX >= maxCam - 0.5;
    }

    function layoutPlanets() {
        const layoutSet = visiblePlanets();
        // If the user provided preferred x/y, use them as seeds; otherwise place in a row.
        const basePad = 26;
        const gap = clamp(w * 0.1, 56, 90); // min distance between circles (in px)
        const usePreferredLayout =
            layoutSet.length <= 7 &&
            layoutSet.every((p) => typeof p.nx === "number" && p.nx >= 0 && p.nx <= 1 && typeof p.ny === "number");
        const maxPlanetRadius = layoutSet.reduce((max, p) => Math.max(max, p.r), 0);
        const xPad = usePreferredLayout ? basePad : EDGE_SAFE_ZONE + maxPlanetRadius;
        const yPad = basePad;

        const sumDiameters = layoutSet.reduce((acc, p) => acc + p.r * 2, 0);
        const minWorld = sumDiameters + gap * Math.max(0, layoutSet.length - 1) + xPad * 2;
        worldW = Math.max(w, Math.ceil(minWorld));

        // Initial positions
        let xCursor = xPad + Math.max(0, (worldW - minWorld) / 2);
        for (let i = 0; i < layoutSet.length; i++) {
            const p = layoutSet[i];

            if (usePreferredLayout) {
                p.wx = clamp(p.nx * worldW, xPad + p.r, worldW - xPad - p.r);
                p.wy = clamp(p.ny * h, yPad + p.r, h - yPad - p.r);
            } else {
                p.wx = xCursor + p.r;
                p.wy = clamp(h * 0.5 + p.layoutYOffset, yPad + p.r, h - yPad - p.r);
                xCursor = p.wx + p.r + gap;
            }
        }

        // Relax overlaps (simple circle packing)
        const iters = 220;
        for (let k = 0; k < iters; k++) {
            let moved = 0;
            for (let i = 0; i < layoutSet.length; i++) {
                for (let j = i + 1; j < layoutSet.length; j++) {
                    const a = layoutSet[i];
                    const b = layoutSet[j];
                    const dx = b.wx - a.wx;
                    const dy = b.wy - a.wy;
                    const dist = Math.hypot(dx, dy) || 0.0001;
                    const minDist = a.r + b.r + gap;
                    if (dist < minDist) {
                        const push = (minDist - dist) * 0.52;
                        const ux = dx / dist;
                        const uy = dy / dist;
                        a.wx -= ux * push;
                        a.wy -= uy * push;
                        b.wx += ux * push;
                        b.wy += uy * push;
                        moved += push;
                    }
                }
            }

            // bounds + mild centering force
            const centerY = h * 0.52;
            for (const p of layoutSet) {
                p.wx = clamp(p.wx, xPad + p.r, worldW - xPad - p.r);
                p.wy = clamp(p.wy + (centerY - p.wy) * 0.015, yPad + p.r, h - yPad - p.r);
            }

            if (moved < 0.5) break;
        }

        // Keep camera in bounds after relayout.
        setCameraTarget(targetCameraX, true);
        ensureNav();
        syncNavState();
    }

    function planetPos(p, t) {
        const bob = Math.sin(t * p.bobSpeed + p.phase) * p.bobAmp;
        // viewport coords (camera applied)
        return { x: p.wx - cameraX, y: p.wy + bob };
    }

    function pickPlanet(mx, my, t) {
        const pickSet = visiblePlanets();
        for (let i = pickSet.length - 1; i >= 0; i--) {
            const p = pickSet[i];
            const pos = planetPos(p, t);
            const view = planetViewState(pos.x, p.r);
            if (view.alpha < 0.18) continue;
            const dx = mx - pos.x, dy = my - pos.y;
            const hitR = p.r * view.scale;
            if (dx * dx + dy * dy <= hitR * hitR) return p;
        }
        return null;
    }

    canvas.addEventListener("click", (e) => {
        if (performance.now() < suppressClickUntil) return;
        pauseAutoPan(4200);
        const clickRect = canvas.getBoundingClientRect();
        const clickX = e.clientX - clickRect.left;
        const clickY = e.clientY - clickRect.top;
        const t = performance.now() / 1000;
        const p = pickPlanet(clickX, clickY, t);
        if (!p) return;
        p.pulse = 1;

        // Anchor popup to the clicked planet (screen coords)
        const pos = planetPos(p, t);
        const anchorX = clickRect.left + pos.x;
        const anchorY = clickRect.top + pos.y;

        if (typeof onSelect === "function") onSelect({ planet: p, anchorX, anchorY, event: e });
    });

    function beltsInCircle(x, y, r, count) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r - 1, 0, Math.PI * 2);
        ctx.clip();
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 1;
        for (let i = 0; i < count; i++) {
            const yy = y + rand(-r * 0.35, r * 0.35);
            const tilt = rand(-0.18, 0.18);
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(tilt);
            ctx.beginPath();
            ctx.moveTo(-r * 1.4, yy - y);
            ctx.lineTo(r * 1.4, yy - y + rand(-1.2, 1.2));
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
    }

    function planetViewState(x, r) {
        if (worldW <= w + 1) return { scale: 1, alpha: 1 };

        const edgeDistance = Math.min(x, w - x);
        const edgeProgress = clamp((edgeDistance - EDGE_SAFE_ZONE + r * 0.3) / Math.max(1, r * 2.35), 0, 1);
        const easedEdge = edgeProgress * edgeProgress * (3 - 2 * edgeProgress);

        return {
            scale: 0.18 + easedEdge * 0.88,
            alpha: easedEdge,
        };
    }

    function drawPlanet(p, x, y, t, view = { scale: 1, alpha: 1 }) {
        const lk = p.look;
        const rr = p.r * view.scale * (1 + p.hover * 0.06) * (1 + p.pulse * 0.12);

        ctx.save();
        ctx.globalAlpha = view.alpha;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        /* ===== ADD THIS BLOCK ===== */
        ctx.beginPath();
        ctx.arc(x, y, rr, 0, Math.PI * 2);
        ctx.fillStyle = "#000";   // black planet fill
        ctx.fill();
        /* ========================== */

        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (lk.type === "halo") chalkHalo(x, y, rr, lk.halo ?? 0.8);

        ctx.strokeStyle = "rgba(255,255,255,0.82)";
        ctx.lineWidth = lk.outline ?? 2.6;
        roughCircle(x, y, rr, lk.passes ?? 2, lk.jitter ?? 1.2);

        ctx.strokeStyle = "rgba(255,255,255,0.30)";
        ctx.lineWidth = Math.max(1, (lk.outline ?? 2.6) * 0.45);
        roughCircle(x, y, rr - 1.6, 1, (lk.jitter ?? 1.2) * 0.8);

        ctx.strokeStyle = "rgba(255,255,255,0.18)";
        ctx.lineWidth = 1;

        if (lk.type === "marble") {
            hatchInCircle(x, y, rr - 1, -0.95, 6.0, lk.hatchAlpha ?? 0.55, 1.0);
            hatchInCircle(x, y, rr - 1, -0.62, 10.5, 0.22, 0.8);
        }

        if (lk.type === "crater") {
            hatchInCircle(x, y, rr - 1, -0.9, 6.8, 0.4, 1.0);
            cratersInCircle(x, y, rr, lk.craterCount ?? 7, 0.12);
        }

        if (lk.type === "split") {
            hatchInCircle(x, y, rr - 1, -0.92, 8.8, 0.18, 0.8);
            halfShadowHatch(x, y, rr, lk.shadowSide ?? +1, -0.95, 6.2, 0.62);
        }

        if (lk.type === "belt") {
            hatchInCircle(x, y, rr - 1, -0.92, 8.0, 0.22, 0.9);
            beltsInCircle(x, y, rr, lk.beltCount ?? 3);
        }

        if (lk.type === "halo") {
            hatchInCircle(x, y, rr - 1, -0.92, 5.0, 0.72, 1.0);
            ctx.strokeStyle = "rgba(255,255,255,0.22)";
            ctx.lineWidth = 1.2;
            roughCircle(x, y, rr * 0.78, 1, 0.9);
        }

        if (lk.type === "dots") {
            ctx.fillStyle = "rgba(255,255,255,0.85)";
            stippleInCircle(x, y, rr - 1, lk.dotDensity ?? 0.016, 0.18);
            hatchInCircle(x, y, rr - 1, -0.7, 14.0, 0.1, 0.6);
        }

        if (p.ring) {
            const rot = p.ringRot + Math.sin(t * 0.2 + p.phase) * 0.06;
            const ringW = lk.ringWidth ?? 2.6;

            ctx.strokeStyle = "rgba(255,255,255,0.76)";
            ctx.lineWidth = ringW;
            roughEllipse(x, y, rr * 1.35, rr * 0.55, rot, 2, 1.1);

            if (lk.ringDouble) {
                ctx.strokeStyle = "rgba(255,255,255,0.26)";
                ctx.lineWidth = Math.max(1.1, ringW * 0.55);
                roughEllipse(x, y, rr * 1.1, rr * 0.44, rot, 1, 0.95);
            }
        }

        if (p.hover > 0.08) {
            ctx.globalAlpha = view.alpha * Math.min(1, p.hover);
            ctx.fillStyle = "rgba(255,255,255,0.86)";
            ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
            ctx.textAlign = "center";
            ctx.fillText(p.name, x, y + rr + 22);
            ctx.globalAlpha = view.alpha;
        }

        ctx.restore();
    }

    let last = performance.now();

    function updateAutoPan(now, dt) {
        if (motionPaused || !autoPan || worldW <= w + 1 || mouse.active || isPanning || now < autoPanPauseUntil) return;

        const maxCam = maxCameraX();
        setCameraTarget(targetCameraX + autoPanDir * autoPanSpeed * dt);

        if (targetCameraX <= 0.5) {
            autoPanDir = 1;
            pauseAutoPan(900);
        } else if (targetCameraX >= maxCam - 0.5) {
            autoPanDir = -1;
            pauseAutoPan(900);
        }
    }

    function updateCamera(dt) {
        if (motionPaused) return;

        if (Math.abs(cameraX - targetCameraX) < 0.05) {
            cameraX = targetCameraX;
            return;
        }

        const ease = 1 - Math.pow(0.0008, dt);
        cameraX += (targetCameraX - cameraX) * ease;
    }

    function frame(now) {
        const dt = Math.min(0.033, (now - last) / 1000);
        last = now;
        const t = now / 1000;

        if (needsRelayout) {
            needsRelayout = false;
            layoutPlanets();
        }

        updateAutoPan(now, dt);
        updateCamera(dt);

        // Clear ONLY this canvas (not the whole screen background)
        ctx.clearRect(0, 0, w, h);

        const hovered = mouse.active
            ? pickPlanet(mouse.x, mouse.y, t)
            : null;

        canvas.style.cursor = hovered ? "pointer" : "default";
        tip.classList.toggle("show", Boolean(hovered));
        if (hovered) {
            tip.textContent = hovered.category
                ? `${hovered.name} - ${hovered.category} - click`
                : `${hovered.name} - click`;
        }

        for (const p of visiblePlanets()) {
            const isHover = hovered === p;
            p.hover += ((isHover ? 1 : 0) - p.hover) * 0.14;

            p.pulse *= Math.pow(0.001, dt);
            if (p.pulse < 0.001) p.pulse = 0;

            const pos = planetPos(p, t);
            const view = planetViewState(pos.x, p.r);
            drawPlanet(p, pos.x, pos.y, t, view);
        }

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);

    // return a small API (optional)
    function setFilterCategory(category) {
        activeCategory = category || "All";
        mouse.active = false;
        tip.classList.remove("show");
        needsRelayout = true;
        setCameraTarget(0, true);
        pauseAutoPan(900);
    }

    return { planets, setMotionPaused, setFilterCategory };
}
