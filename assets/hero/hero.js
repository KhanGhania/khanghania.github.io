// Home hero: flaxen light → constellation lion → phoenix embers → Flaxen wings.
// Plain Canvas 2D, no libraries, so it runs anywhere GitHub Pages does.
(async function () {
  const canvas = document.querySelector(".hero canvas");
  if (!canvas) return;
  const hero = canvas.parentElement;
  const ctx = canvas.getContext("2d");
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let lion, wings;
  try {
    [lion, wings] = await Promise.all([
      fetch("assets/hero/lion.json").then((r) => r.json()),
      fetch("assets/hero/wings.json").then((r) => r.json()),
    ]);
  } catch (e) {
    // Drawings could not load: show the still logo and the name instead of an empty hero.
    root.dataset.hero = "still"; root.dataset.stage = "named";
    return;
  }
  root.dataset.hero = "live";

  const lionLayers = lion.layers.map((L) => ({ color: L.color, path: new Path2D(L.d) }));
  const lineColor = lion.layers[lion.layers.length - 1].color;
  const wingPath = new Path2D(wings.d);

  let W = 0, H = 0, DPR = 1, small = false;
  let lionBox, wingBox, wingBounds;

  // ---------- layout ----------
  function measureWingBounds() {
    const c = document.createElement("canvas");
    c.width = c.height = 540;
    const g = c.getContext("2d");
    g.scale(0.5, 0.5);
    g.fill(wingPath);
    const d = g.getImageData(0, 0, 540, 540).data;
    let x0 = 540, y0 = 540, x1 = 0, y1 = 0;
    for (let y = 0; y < 540; y++)
      for (let x = 0; x < 540; x++)
        if (d[(y * 540 + x) * 4 + 3] > 20) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
    return { x: x0 * 2, y: y0 * 2, w: (x1 - x0) * 2, h: (y1 - y0) * 2 };
  }
  wingBounds = measureWingBounds();

  // Fit the emblems into the free band between the words (top) and the identity block (bottom),
  // so nothing overlaps on short laptop screens or phones.
  function freeBand() {
    const hr = hero.getBoundingClientRect();
    const words = hero.querySelector(".words"), id = hero.querySelector(".id");
    const nav = document.querySelector("header.site");
    let top = 0;
    if (nav) top = Math.max(top, nav.getBoundingClientRect().bottom - hr.top);
    if (words) top = Math.max(top, words.getBoundingClientRect().bottom - hr.top);
    const bottom = id ? id.getBoundingClientRect().top - hr.top : H;
    const gap = Math.max(14, H * 0.025);
    return { top: top + gap, bottom: Math.max(top + gap + 120, bottom - gap) };
  }

  function layout() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = hero.clientWidth; H = hero.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    small = W < 700;
    const band = freeBand();
    const bh = band.bottom - band.top;
    const cx = W / 2, cy = band.top + bh / 2;
    const lh = Math.min(bh, W * 0.82 * (265 / 220));
    const ls = lh / lion.viewBox[3];
    lionBox = { s: ls, x: cx - (lion.viewBox[2] * ls) / 2, y: cy - lh / 2 };
    const ww = Math.min(W * (small ? 0.78 : 0.46), bh * 0.94 * (wingBounds.w / wingBounds.h));
    const ws = ww / wingBounds.w;
    wingBox = { s: ws, x: cx - (wingBounds.x + wingBounds.w / 2) * ws, y: cy - (wingBounds.y + wingBounds.h / 2) * ws };
  }

  // ---------- sample target points from a drawing ----------
  function sample(draw, box, n, size) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d", { willReadFrequently: true });
    draw(g);
    const d = g.getImageData(0, 0, size, size).data;
    const pts = [];
    for (let y = 0; y < size; y += 2)
      for (let x = 0; x < size; x += 2) {
        const i = (y * size + x) * 4;
        if (d[i + 3] > 90) pts.push([x, y, d[i], d[i + 1], d[i + 2]]);
      }
    const out = [];
    for (let k = 0; k < n; k++) {
      const p = pts[(Math.random() * pts.length) | 0];
      out.push(p);
    }
    return out;
  }

  let P = [];
  function buildParticles() {
    const N = small ? 1100 : 2200;
    const LS = 600, ls = LS / lion.viewBox[3];
    const lionPts = sample((g) => {
      g.scale(ls, ls);
      lionLayers.forEach((L) => { g.fillStyle = L.color; g.fill(L.path); });
      g.strokeStyle = lineColor; g.lineWidth = 1.8;
      lion.edges.forEach(([a, b]) => {
        const A = lion.nodes[a], B = lion.nodes[b];
        g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke();
      });
      g.fillStyle = lineColor;
      lion.nodes.forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r + 1, 0, 7); g.fill(); });
    }, null, N, LS);

    const WS = 640, wsc = WS / Math.max(wingBounds.w, wingBounds.h);
    const wingPts = sample((g) => {
      g.translate(-wingBounds.x * wsc, -wingBounds.y * wsc);
      g.scale(wsc, wsc);
      const gr = g.createLinearGradient(wingBounds.x, wingBounds.y, wingBounds.x + wingBounds.w, wingBounds.y + wingBounds.h);
      gr.addColorStop(0, "#E1AD9E"); gr.addColorStop(1, "#A57D71");
      g.fillStyle = gr; g.fill(wingPath);
    }, null, N, WS);

    P = [];
    for (let i = 0; i < N; i++) {
      const l = lionPts[i], w = wingPts[i];
      P.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: 0, vy: 0,
        hx: Math.random() * W, hy: Math.random() * H, // drift home
        lx: l[0] / ls, ly: l[1] / ls, lc: [l[2], l[3], l[4]],
        wx: wingBounds.x + w[0] / wsc, wy: wingBounds.y + w[1] / wsc, wc: [w[2], w[3], w[4]],
        delay: Math.random() * 0.7,
        size: 0.6 + Math.random() * 1.5,
        tw: Math.random() * 6.28,
      });
    }
  }

  // glow sprite
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = 32;
  (function () {
    const g = sprite.getContext("2d");
    const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.25, "rgba(255,255,255,0.55)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  })();
  const tinted = new Map();
  function tint(r, g, b) {
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    let c = tinted.get(key);
    if (!c) {
      c = document.createElement("canvas"); c.width = c.height = 32;
      const x = c.getContext("2d");
      x.drawImage(sprite, 0, 0);
      x.globalCompositeOperation = "source-in";
      x.fillStyle = `rgb(${r},${g},${b})`; x.fillRect(0, 0, 32, 32);
      tinted.set(key, c);
    }
    return c;
  }

  // ---------- timeline ----------
  const T = { drift: 0, lion: 1.3, lionSharp: 3.3, ignite: 4.8, wings: 6.2, wingSharp: 7.6, name: 7.3, end: 9.5 };
  let t0 = performance.now(), last = t0, skipped = false;
  const mouse = { x: -9999, y: -9999, active: false };

  hero.addEventListener("pointermove", (e) => { const r = hero.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.active = true; });
  hero.addEventListener("pointerleave", () => { mouse.active = false; mouse.x = mouse.y = -9999; });
  let visible = true;
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(hero);
  addEventListener("resize", () => { layout(); buildParticles(); if (elapsed() > T.wings) settle(); });

  function elapsed() { return (performance.now() - t0) / 1000; }
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));
  const clamp = (x) => Math.max(0, Math.min(1, x));

  function setStage(name) { root.dataset.stage = name; }

  function settle() {
    P.forEach((p) => { p.x = wingBox.x + p.wx * wingBox.s; p.y = wingBox.y + p.wy * wingBox.s; p.vx = p.vy = 0; });
  }

  function skip() {
    skipped = true;
    t0 = performance.now() - T.end * 1000;
    settle();
  }
  document.getElementById("skip").addEventListener("click", (e) => { skip(); });
  document.getElementById("replay").addEventListener("click", () => {
    skipped = false; t0 = performance.now();
    P.forEach((p) => { p.x = Math.random() * W; p.y = Math.random() * H; p.vx = p.vy = 0; });
  });

  function drawLionSharp(alpha) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(lionBox.x, lionBox.y);
    ctx.scale(lionBox.s, lionBox.s);
    lionLayers.forEach((L) => { ctx.fillStyle = L.color; ctx.fill(L.path); });
    ctx.strokeStyle = lineColor; ctx.lineWidth = 1.2; ctx.lineCap = "round";
    lion.edges.forEach(([a, b]) => {
      const A = lion.nodes[a], B = lion.nodes[b];
      ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
    });
    ctx.fillStyle = lineColor;
    lion.nodes.forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); });
    ctx.fillStyle = "#EBB6A5";
    lion.sparkles.forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); });
    ctx.restore();
  }

  function drawWingsSharp(alpha) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(wingBox.x, wingBox.y);
    ctx.scale(wingBox.s, wingBox.s);
    const gr = ctx.createLinearGradient(wingBounds.x, wingBounds.y, wingBounds.x + wingBounds.w, wingBounds.y + wingBounds.h);
    gr.addColorStop(0, "#E1AD9E"); gr.addColorStop(1, "#A57D71");
    ctx.shadowColor = "rgba(225,173,158,0.45)"; ctx.shadowBlur = 40 / wingBox.s;
    ctx.fillStyle = gr; ctx.fill(wingPath);
    ctx.restore();
  }

  // ---------- frame ----------
  function frame(now) {
    // The page's safety timer showed the still logo because frames stalled: jump to the finished logo.
    if (root.dataset.hero === "still") { root.dataset.hero = "live"; skip(); }
    const t = elapsed();
    // stage labels for the HTML words (kept up to date even while the hero is off screen)
    const mid = (T.ignite + T.wings) / 2;
    setStage(t < T.lion ? "drift" : t < T.ignite ? "courage" : t < mid ? "resilience" : t < T.wings ? "rise" : t < T.name ? "wings" : "named");
    if (!visible) { last = now; requestAnimationFrame(frame); return; }
    const dt = Math.min(0.033, (now - last) / 1000); last = now;
    const f = dt * 60;

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(15,14,14,0.34)";
    ctx.fillRect(0, 0, W, H);

    const lionSharp = clamp((t - T.lionSharp) / 0.7) * (1 - clamp((t - T.ignite) / 0.35));
    const wingSharp = clamp((t - T.wingSharp) / 0.9);
    drawLionSharp(lionSharp);
    drawWingsSharp(wingSharp);

    ctx.globalCompositeOperation = "lighter";
    const igniting = t >= T.ignite && t < T.wings;
    for (const p of P) {
      let tx, ty, k = 0, damp = 0.86, col = [244, 214, 200], a = 0.7;
      if (t < T.lion) {
        // drifting flaxen dust
        p.hx += Math.sin(t * 0.6 + p.tw) * 0.3; p.hy += Math.cos(t * 0.5 + p.tw) * 0.3;
        tx = p.hx; ty = p.hy; k = 0.004; damp = 0.94; a = 0.45;
      } else if (t < T.ignite) {
        const prog = ease((t - T.lion - p.delay) / 1.6);
        tx = lionBox.x + p.lx * lionBox.s; ty = lionBox.y + p.ly * lionBox.s;
        k = 0.004 + 0.07 * prog; damp = 0.82;
        col = p.lc.map((c, i) => c + (col[i] - c) * (1 - prog));
        a = 0.55 + 0.25 * prog - lionSharp * 0.45;
      } else if (igniting) {
        // embers: rise and flicker like a phoenix catching fire
        const q = (t - T.ignite) / (T.wings - T.ignite);
        // each ember climbs at its own pace and sways like a flame tongue
        p.vy -= (0.12 + p.size * 0.12 + Math.random() * 0.1) * f;
        p.vx += (Math.sin(p.y * 0.018 + t * 6 + p.tw) * 0.45 + (p.x < W / 2 ? 0.05 : -0.05)) * f;
        col = [255, 200 - 40 * q, 150 - 70 * q];
        a = 0.9;
      } else {
        const prog = ease((t - T.wings - p.delay * 0.6) / 1.3);
        tx = wingBox.x + p.wx * wingBox.s; ty = wingBox.y + p.wy * wingBox.s;
        k = 0.01 + 0.08 * prog; damp = 0.8;
        col = p.wc.map((c, i) => 255 + (c - 255) * prog);
        a = 0.85 - 0.6 * wingSharp;
        if (t > T.end) { tx += Math.sin(t * 1.3 + p.tw) * 1.5; ty += Math.cos(t * 1.1 + p.tw) * 1.5; }
      }
      if (tx !== undefined) {
        p.vx += (tx - p.x) * k * f; p.vy += (ty - p.y) * k * f;
      }
      if (mouse.active) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 9000) {
          const fz = (1 - d2 / 9000) * (t < T.lion ? -0.25 : 1.4);
          const d = Math.sqrt(d2) || 1;
          p.vx += (dx / d) * fz * f; p.vy += (dy / d) * fz * f;
        }
      }
      p.vx *= Math.pow(damp, f); p.vy *= Math.pow(damp, f);
      p.x += p.vx * f; p.y += p.vy * f;
      if (a <= 0.02) continue;
      const tw = 0.75 + 0.25 * Math.sin(t * 3 + p.tw);
      const s = p.size * (igniting ? 7 : 5) * tw;
      ctx.globalAlpha = Math.min(1, a);
      ctx.drawImage(tint(col[0] | 0, col[1] | 0, col[2] | 0), p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  layout();
  buildParticles();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layout(); buildParticles(); if (elapsed() > T.wings) settle(); });
  if (reduce) { root.dataset.reduced = "1"; skip(); }
  requestAnimationFrame(frame);
})();
