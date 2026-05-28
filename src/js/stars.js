const mouse = { x: 0, y: 0, active: false };

const CONSTELLATION_RADIUS = 140;      // how big the “hover area” is
const STAR_LINK_RADIUS = 95;           // max distance between two stars to draw a line
const MAX_LINKS_PER_STAR = 2;          // cap per-star links
const MAX_STARS_IN_AREA = 60;          // performance cap for stars near mouse

let lastTime = performance.now();

(() => {
  const canvas = document.getElementById("starfield");
  if (!canvas) {
    console.error("Canvas #starfield not found");
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("2D context not available");
    return;
  }

  const STAR_COUNT = 500;
  const TWINKLE_RATIO = 0.25;

  let w = 0, h = 0, dpr = 1;
  const stars = [];
  let shooting = null;

  const rand = (min, max) => Math.random() * (max - min) + min;

  function resize() {
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    w = window.innerWidth;
    h = window.innerHeight;

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function initStars() {
    stars.length = 0;
    for (let i = 0; i < STAR_COUNT; i++) {
      const twinkles = Math.random() < TWINKLE_RATIO;
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: rand(0.4, 1.6),
        a: rand(0.4, 1.0),
        twinkles,
        phase: Math.random() * Math.PI * 2,
        speed: rand(0.6, 1.6),
      });
    }
  }

  function spawnShootingStar() {
    // Start OUTSIDE the screen: either above the top edge or left of the left edge
    const fromTop = Math.random() < 0.6;

    const margin = 120; // how far outside it spawns

    const startX = fromTop ? rand(0, w) : -margin;
    const startY = fromTop ? -margin : rand(0, h * 0.7);

    // Slower speed than before
    const speed = 650; // was ~1200; lower = slower

    // Diagonal down-right direction
    const angle = rand(Math.PI * 0.22, Math.PI * 0.30); // slightly tighter range
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    shooting = {
      x: startX,
      y: startY,
      vx,
      vy,
      life: 0,
      maxLife: rand(0.9, 1.4), // longer visible time
    };
  }

  // UPDATED: nearest-neighbor constellation links near cursor
  function drawConstellation() {
    if (!mouse.active) return;

    const r2 = CONSTELLATION_RADIUS * CONSTELLATION_RADIUS;

    // Collect stars near mouse (use rendered positions if available)
    const near = [];
    for (const s of stars) {
      const sx = (s._px ?? s.x);
      const sy = (s._py ?? s.y);

      const dx = sx - mouse.x;
      const dy = sy - mouse.y;

      const dm = dx * dx + dy * dy;
      if (dm <= r2) {
        near.push({ s, x: sx, y: sy, dm });
        if (near.length >= MAX_STARS_IN_AREA) break;
      }
    }

    if (near.length < 2) return;

    // Prefer closer-to-mouse stars (cleaner pattern)
    near.sort((a, b) => a.dm - b.dm);

    const linkR2 = STAR_LINK_RADIUS * STAR_LINK_RADIUS;

    ctx.save();
    ctx.lineWidth = 1;
    ctx.globalCompositeOperation = "lighter";

    for (let i = 0; i < near.length; i++) {
      const a = near[i];
      let links = 0;

      // Find nearest neighbors for star A
      const candidates = [];
      for (let j = i + 1; j < near.length; j++) {
        const b = near[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;

        if (d2 <= linkR2) candidates.push({ b, d2 });
      }

      // Connect to the closest ones only
      candidates.sort((c1, c2) => c1.d2 - c2.d2);

      for (const c of candidates) {
        const b = c.b;
        const d = Math.sqrt(c.d2);

        // Stronger near cursor center
        const mouseBoost = 1 - Math.min(1, Math.sqrt(a.dm) / CONSTELLATION_RADIUS);

        // Distance fade (subtle)
        const alpha = (1 - d / STAR_LINK_RADIUS) * (0.08 + mouseBoost * 0.20);

        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        links++;
        if (links >= MAX_LINKS_PER_STAR) break;
      }
    }

    ctx.restore();
  }

  // Mouse tracking for constellation hover
  window.addEventListener("mousemove", (e) => {
    mouse.active = true;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  window.addEventListener("mouseleave", () => {
    mouse.active = false;
  });

  function draw(now) {
    const t = now / 1000;

    // Paint a black background ON the canvas (so we always see it)
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    // Stars
    ctx.fillStyle = "#fff";
    for (const s of stars) {
      let alpha = s.a;
      if (s.twinkles) {
        alpha = s.a * (0.55 + 0.45 * Math.sin(t * s.speed + s.phase));
        alpha = Math.max(0.15, Math.min(1.0, alpha));
      }
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // NEW: draw constellation links after stars
    drawConstellation();

    // Shooting star occasionally
    if (!shooting && Math.random() < 0.008) spawnShootingStar();

    if (shooting) {
      const dt = Math.min(0.033, (now - lastTime) / 1000);
      shooting.life += dt;
      shooting.x += shooting.vx * dt;
      shooting.y += shooting.vy * dt;

      const fade = 1 - shooting.life / shooting.maxLife;
      const a = Math.max(0, fade);

      const len = 220;
      const mag = Math.hypot(shooting.vx, shooting.vy);
      const ux = shooting.vx / mag;
      const uy = shooting.vy / mag;

      const x2 = shooting.x - ux * len;
      const y2 = shooting.y - uy * len;

      const grad = ctx.createLinearGradient(shooting.x, shooting.y, x2, y2);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(1, "rgba(255,255,255,0)");

      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(shooting.x, shooting.y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();

      if (
        shooting.life > shooting.maxLife ||
        shooting.x > w + len ||
        shooting.y > h + len
      ) {
        shooting = null;
      }
    }

    lastTime = now;
    requestAnimationFrame(draw);
  }

  resize();
  initStars();
  window.addEventListener("resize", () => {
    resize();
    initStars();
  });

  requestAnimationFrame(draw);
})();
