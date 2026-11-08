// Shared behaviour for every page: ambient embers, scroll reveals, rising thread,
// constellations that draw in, counters, manifesto lighting, lightbox, copy buttons.
(function () {
  const root = document.documentElement;

  // Open every page at the top when it is reached by clicking a link (not when going Back/Forward,
  // and not when the link points at a section such as #contact).
  try {
    const nav = performance.getEntriesByType("navigation")[0];
    if ((!nav || nav.type === "navigate" || nav.type === "reload") && !location.hash) {
      scrollTo(0, 0);
      addEventListener("load", () => scrollTo(0, 0));
    }
  } catch (e) {}
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Home hero safety net: if the intro animation has not finished after 12 seconds (script blocked,
  // slow network, frozen frame), show the still logo, the name and the buttons anyway.
  if (document.querySelector(".hero canvas")) {
    setTimeout(() => {
      if (root.dataset.stage !== "named") { root.dataset.hero = "still"; root.dataset.stage = "named"; }
    }, 12000);
  }

  // ---------- ambient embers ----------
  const cv = document.getElementById("embers");
  if (cv && !reduce) {
    const g = cv.getContext("2d");
    let W, H, DPR, E = [];
    const mouse = { x: -1e4, y: -1e4 };
    const size = () => {
      DPR = Math.min(devicePixelRatio || 1, 1.5);
      W = innerWidth; H = innerHeight;
      cv.width = W * DPR; cv.height = H * DPR;
      const n = Math.round(Math.min(90, (W * H) / 16000));
      E = Array.from({ length: n }, () => spawn(true));
    };
    const spawn = (anywhere) => ({
      x: Math.random() * W, y: anywhere ? Math.random() * H : H + 10,
      v: 0.15 + Math.random() * 0.45, r: 0.6 + Math.random() * 1.8,
      a: 0.15 + Math.random() * 0.5, ph: Math.random() * 6.28, dx: 0,
    });
    addEventListener("resize", size);
    addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
    size();
    let last = performance.now();
    const tick = (now) => {
      const f = Math.min(2, (now - last) / 16.7); last = now;
      if (!document.hidden) {
        g.setTransform(DPR, 0, 0, DPR, 0, 0);
        g.clearRect(0, 0, W, H);
        g.globalCompositeOperation = "lighter";
        for (const p of E) {
          p.y -= p.v * f;
          p.x += Math.sin(now / 1400 + p.ph) * 0.25 * f + p.dx;
          p.dx *= 0.94;
          const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < 12000) p.dx += (dx / Math.sqrt(d2 || 1)) * 0.6;
          if (p.y < -10) Object.assign(p, spawn(false));
          const tw = 0.6 + 0.4 * Math.sin(now / 500 + p.ph);
          const rg = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
          rg.addColorStop(0, `rgba(255,207,184,${p.a * tw})`);
          rg.addColorStop(1, "rgba(225,173,158,0)");
          g.fillStyle = rg;
          g.beginPath(); g.arc(p.x, p.y, p.r * 5, 0, 7); g.fill();
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ---------- constellation line lengths ----------
  document.querySelectorAll(".constellation line").forEach((l) => {
    const len = Math.hypot(l.x2.baseVal.value - l.x1.baseVal.value, l.y2.baseVal.value - l.y1.baseVal.value);
    l.style.setProperty("--len", Math.ceil(len) + 1);
  });
  document.querySelectorAll(".constellation path.draw").forEach((p) => {
    try { p.style.setProperty("--len", Math.ceil(p.getTotalLength()) + 1); } catch (e) {}
  });

  // ---------- reveal on scroll ----------
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { rootMargin: "0px 0px -12% 0px" });
  document.querySelectorAll(".rv, .constellation, .moment").forEach((el) => io.observe(el));

  // ---------- counters ----------
  const cio = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target, to = +el.dataset.count, suf = el.dataset.suffix || "";
      cio.unobserve(el);
      if (reduce) { el.textContent = to + suf; return; }
      const t0 = performance.now(), dur = 1600;
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(to * e) + suf;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll("[data-count]").forEach((el) => cio.observe(el));

  // ---------- manifesto words ----------
  const mani = document.querySelector(".manifesto p");
  let words = [];
  if (mani) {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((w) => {
            if (!w.trim()) { frag.appendChild(document.createTextNode(w)); return; }
            const s = document.createElement("span");
            s.className = "w" + (node.tagName === "EM" ? " hl" : "");
            s.textContent = w; frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(mani);
    mani.querySelectorAll("em").forEach((em) => em.replaceWith(...em.childNodes));
    words = [...mani.querySelectorAll(".w")];
  }

  // ---------- scroll-driven bits ----------
  const thread = document.querySelector(".thread i");
  const megas = [...document.querySelectorAll(".mega")];
  const lines = [...document.querySelectorAll(".timeline")];
  let ticking = false;
  const header = document.querySelector("header.site");
  const onScroll = () => {
    ticking = false;
    const vh = innerHeight;
    if (header) header.style.setProperty("--hb", scrollY > 40 ? 1 : 0);
    if (thread) {
      const max = document.documentElement.scrollHeight - vh;
      thread.style.setProperty("--p", max > 0 ? scrollY / max : 0);
      thread.parentElement.style.setProperty("--p", max > 0 ? scrollY / max : 0);
    }
    if (words.length) {
      const r = mani.getBoundingClientRect();
      const k = Math.max(0, Math.min(1, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      const n = Math.round(k * words.length);
      words.forEach((w, i) => w.classList.toggle("lit", i < n));
    }
    megas.forEach((m) => {
      const r = m.getBoundingClientRect();
      const k = Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.9)));
      m.style.setProperty("--fill", (k * 100).toFixed(1) + "%");
    });
    lines.forEach((tl) => {
      const r = tl.getBoundingClientRect();
      const k = Math.max(0, Math.min(1, (vh * 0.6 - r.top) / r.height));
      tl.style.setProperty("--tp", k);
    });
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener("resize", onScroll);
  onScroll();

  // ---------- shine follows pointer ----------
  document.querySelectorAll(".shine").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", e.clientX - r.left + "px");
      el.style.setProperty("--my", e.clientY - r.top + "px");
    });
  });

  // ---------- lightbox ----------
  let box = null;
  const close = () => { if (box) { box.remove(); box = null; document.body.style.overflow = ""; } };
  const open = (src, alt, caption, link) => {
    box = document.createElement("div");
    box.className = "lightbox"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
    box.innerHTML = '<button class="btn" type="button">Close</button><div><img alt=""><p></p></div>';
    const img = box.querySelector("img"); img.src = src; img.alt = alt;
    const p = box.querySelector("p"); p.textContent = caption;
    if (link) { const a = document.createElement("a"); a.href = link; a.target = "_blank"; a.rel = "noopener"; a.textContent = " · Open original"; p.appendChild(a); }
    box.addEventListener("click", (e) => { if (e.target === box || e.target.tagName === "BUTTON") close(); });
    document.body.appendChild(box); document.body.style.overflow = "hidden";
    box.querySelector("button").focus();
  };
  addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  document.querySelectorAll(".tile.img").forEach((t) => {
    t.addEventListener("click", (e) => {
      if (t.classList.contains("broken")) return;
      e.preventDefault();
      const img = t.querySelector("img");
      open(t.dataset.full, img.alt, t.querySelector(".cap span").textContent, t.href);
    });
  });
  document.querySelectorAll(".tile img").forEach((img) => {
    const mark = () => img.closest(".tile").classList.add("broken");
    img.addEventListener("error", mark);
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) mark();
  });

  // ---------- folder nav highlight ----------
  const nav = document.querySelectorAll(".folder-nav a");
  if (nav.length) {
    const map = {}; nav.forEach((a) => (map[a.getAttribute("href").slice(1)] = a));
    const fio = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        nav.forEach((a) => a.classList.remove("on"));
        const a = map[en.target.id];
        if (a) { a.classList.add("on"); a.scrollIntoView({ block: "nearest", inline: "center" }); }
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    document.querySelectorAll(".folder").forEach((f) => fio.observe(f));
  }

  // ---------- copy buttons ----------
  document.querySelectorAll(".copy").forEach((btn) => {
    btn.addEventListener("click", () => {
      const done = () => { btn.textContent = "Copied"; setTimeout(() => (btn.textContent = "Copy"), 1600); };
      const fallback = () => {
        const v = btn.parentElement.querySelector(".v, a"); if (!v) return;
        const r = document.createRange(); r.selectNodeContents(v);
        const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      };
      try { navigator.clipboard.writeText(btn.dataset.copy).then(done, fallback); } catch (e) { fallback(); }
    });
  });

  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
