/* Portfolio v2 labs: interactive modules. Depends on translations.js and script.js. */
(() => {
  const T = window.NING_TRANSLATIONS ?? {};
  const lang = () => (document.body.dataset.language === "en" ? "en" : "zh");
  const t = (key) => (T[lang()] ?? {})[key] ?? (T.zh ?? {})[key] ?? key;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const onLanguage = [];
  $$("[data-language]").forEach((b) => b.addEventListener("click", () => setTimeout(() => onLanguage.forEach((fn) => fn()), 0)));

  /* ---------- count-up ---------- */
  const countObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      obs.unobserve(entry.target);
      const el = entry.target;
      const end = Number(el.dataset.countup);
      const pre = el.dataset.prefix ?? "";
      const suf = el.dataset.suffix ?? "";
      if (reduced.matches) return;
      const start = performance.now();
      const dur = 1200;
      const step = (now) => {
        const k = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - k, 3);
        el.textContent = `${pre}${Math.round(end * eased)}${suf}`;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  $$("[data-countup]").forEach((el) => countObserver.observe(el));

  /* ---------- manifesto scrub ---------- */
  const manifesto = $("[data-manifesto]");
  const line = $("[data-scrub-text]");
  let words = [];
  const splitLine = () => {
    if (!line) return;
    const text = t(line.dataset.i18n);
    const parts = lang() === "en" ? text.split(/(\s+)/) : [...text];
    line.textContent = "";
    words = [];
    parts.forEach((p) => {
      if (/^\s+$/.test(p)) { line.append(p); return; }
      const s = document.createElement("span");
      s.className = "w";
      s.textContent = p;
      line.append(s);
      words.push(s);
    });
    scrub();
  };
  let scrubFrame = 0;
  const scrub = () => {
    scrubFrame = 0;
    if (!manifesto) return;
    const r = manifesto.getBoundingClientRect();
    const vh = window.innerHeight;
    const k = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height * 0.9)));
    const lit = reduced.matches ? words.length : Math.round(k * words.length);
    words.forEach((w, i) => w.classList.toggle("on", i < lit));
    manifesto.style.setProperty("--scrub", reduced.matches ? 1 : k.toFixed(3));
  };
  if (line) {
    splitLine();
    onLanguage.push(splitLine);
    window.addEventListener("scroll", () => { if (!scrubFrame) scrubFrame = requestAnimationFrame(scrub); }, { passive: true });
  }

  /* ---------- ticket ring ---------- */
  const ringValue = $("[data-ring-value]");
  const ringLabel = $("[data-ring-label]");
  const ringData = { done: [168, "ringDone"], active: [9, "ringActive"], hold: [2, "ringHold"], rejected: [4, "ringRejected"] };
  const setRing = (key) => {
    const [n, label] = ringData[key] ?? ringData.done;
    if (ringValue) ringValue.textContent = n;
    if (ringLabel) { ringLabel.dataset.i18n = label; ringLabel.textContent = t(label); }
    $$("[data-ring-seg]").forEach((s) => s.classList.toggle("is-hot", s.dataset.ringSeg === key));
    $$("[data-ring-key]").forEach((li) => li.classList.toggle("is-hot", li.dataset.ringKey === key));
  };
  $$("[data-ring-seg], [data-ring-key]").forEach((el) => {
    const key = el.dataset.ringSeg ?? el.dataset.ringKey;
    ["pointerenter", "focus", "click"].forEach((ev) => el.addEventListener(ev, () => setRing(key)));
    el.addEventListener("pointerleave", () => setRing("done"));
  });

  /* ---------- agent registry ---------- */
  const regText = $("[data-registry-text]");
  const regKey = { data: "regDataText", report: "regReportText", creative: "regCreativeText", pm: "regPmText", ops: "regOpsText" };
  let regActive = "data";
  const setRegistry = (key) => {
    regActive = key;
    $$("[data-registry]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.registry === key)));
    if (regText) { regText.dataset.i18n = regKey[key]; regText.textContent = t(regKey[key]); }
  };
  $$("[data-registry]").forEach((b) => b.addEventListener("click", () => setRegistry(b.dataset.registry)));
  if (regText) setRegistry("data");
  onLanguage.push(() => regText && setRegistry(regActive));

  /* ---------- gate lab ---------- */
  const gateRules = {
    draft: { on: [], verdict: "verdictDraft" },
    merge: { on: ["tests", "secrets", "review"], verdict: "verdictMerge" },
    prod: { on: ["tests", "secrets", "review", "human"], hold: "human", verdict: "verdictProd" },
    delete: { on: [], blocked: "human", verdict: "verdictDelete" },
  };
  const verdictEl = $("[data-gate-verdict]");
  let gateTimers = [];
  const setGate = (action) => {
    gateTimers.forEach(clearTimeout);
    gateTimers = [];
    const rule = gateRules[action];
    $$("[data-gate-action]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.gateAction === action)));
    const lanes = $$("[data-gate]");
    lanes.forEach((li) => li.classList.remove("on", "hold", "blocked"));
    lanes.forEach((li, i) => {
      const id = li.dataset.gate;
      const apply = () => {
        if (rule.on.includes(id)) li.classList.add("on");
        if (rule.hold === id) li.classList.add("hold");
        if (rule.blocked === id) li.classList.add("blocked");
      };
      if (reduced.matches) apply(); else gateTimers.push(setTimeout(apply, 160 * i));
    });
    if (verdictEl) { verdictEl.dataset.i18n = rule.verdict; verdictEl.textContent = t(rule.verdict); }
  };
  $$("[data-gate-action]").forEach((b) => b.addEventListener("click", () => setGate(b.dataset.gateAction)));
  let gateActive = "draft";
  $$("[data-gate-action]").forEach((b) => b.addEventListener("click", () => { gateActive = b.dataset.gateAction; }));
  if ($("[data-gate-lab]")) setGate("draft");
  onLanguage.push(() => $("[data-gate-lab]") && setGate(gateActive));

  /* ---------- war room (adapted scenario) ---------- */
  const wrAgents = {
    zh: [
      { name: "法規差異追蹤", task: "比對新舊管制條文", model: "Sonnet", tier: "sonnet", speed: 1.0 },
      { name: "料號對照 ×3", task: "2,400 個料號 → 管制分類", model: "Haiku", tier: "haiku", speed: 1.6 },
      { name: "出貨清查", task: "未來 30 天出貨單", model: "Haiku", tier: "haiku", speed: 1.3 },
      { name: "風險備忘", task: "給客戶的決策備忘錄", model: "Opus", tier: "opus", speed: 0.55 },
      { name: "影響看板", task: "料號 × 客戶 × 地區看板", model: "Codex", tier: "codex", speed: 0.8 },
      { name: "對抗審查", task: "審查備忘與看板", model: "GPT", tier: "codex", speed: 0.7, after: 3 },
    ],
    en: [
      { name: "Rule diff tracker", task: "Compare old and new control text", model: "Sonnet", tier: "sonnet", speed: 1.0 },
      { name: "Part mapper ×3", task: "2,400 part numbers → control class", model: "Haiku", tier: "haiku", speed: 1.6 },
      { name: "Shipment sweep", task: "Next 30 days of shipments", model: "Haiku", tier: "haiku", speed: 1.3 },
      { name: "Risk memo", task: "Decision memo for the client", model: "Opus", tier: "opus", speed: 0.55 },
      { name: "Impact board", task: "Part × customer × region board", model: "Codex", tier: "codex", speed: 0.8 },
      { name: "Adversarial review", task: "Review memo and board", model: "GPT", tier: "codex", speed: 0.7, after: 3 },
    ],
  };
  const wrLogs = {
    zh: [
      ["", "派工：6 個代理，預估 41 分鐘"], ["", "法規差異：新增 3 個效能門檻、2 個地區"], ["", "料號對照：第 1 批 800 筆完成"],
      ["gate", "閘門 G1：分類規則測試 42/42 通過"], ["", "出貨清查：找到 17 張受影響出貨單"], ["", "顧問呼叫：Opus 檢查備忘結構"],
      ["", "料號對照：2,400 筆完成，126 筆受管制"], ["gate", "閘門 G2：密鑰掃描乾淨"], ["", "影響看板：預覽已部署到開發環境"],
      ["gate", "閘門 G3：跨模型審查提出 2 點，已修正"], ["ok", "完成：備忘錄與看板進入明早建議報告，等人核准"],
    ],
    en: [
      ["", "Dispatch: 6 agents, ETA 41 min"], ["", "Rule diff: 3 new performance thresholds, 2 regions"], ["", "Part mapper: batch 1 of 800 done"],
      ["gate", "Gate G1: classification tests 42/42 pass"], ["", "Shipment sweep: 17 affected shipments found"], ["", "Advisor call: Opus checks memo structure"],
      ["", "Part mapper: 2,400 done, 126 controlled"], ["gate", "Gate G2: secret scan clean"], ["", "Impact board: preview deployed to dev"],
      ["gate", "Gate G3: cross-model review raised 2 points, fixed"], ["ok", "Done: memo and board queued in tomorrow's brief for approval"],
    ],
  };
  const wrRows = $("[data-warroom-rows]");
  const wrLog = $("[data-warroom-log]");
  const warroom = $("[data-warroom]");
  let wrTick = 0;
  let wrTimer = 0;
  let wrRunning = false;
  const wrRender = () => {
    if (!wrRows) return;
    const agents = wrAgents[lang()];
    const time = wrTick;
    wrRows.innerHTML = agents.map((a, i) => {
      const startAt = a.after ? 26 : i * 1.5;
      const p = Math.max(0, Math.min(100, Math.round((time - startAt) * a.speed * 3.1)));
      const waiting = i === 3 && p >= 100;
      const state = p >= 100 ? (waiting ? "wait" : "done") : "";
      const eta = p >= 100 ? (waiting ? "⏸" : "✓") : `${Math.max(1, Math.round((100 - p) / (a.speed * 3.1) / 2))}m`;
      return `<div class="wr-row ${state}"><div class="wr-name"><b>${a.name}</b><small>${a.task}</small></div><span class="wr-model" data-tier="${a.tier}">${a.model}</span><div class="wr-bar"><i style="--p:${p}%"></i></div><span class="wr-pct">${p}%</span><span class="wr-eta">${eta}</span></div>`;
    }).join("");
    if (wrLog) {
      const logs = wrLogs[lang()];
      const shown = Math.min(logs.length, Math.floor(time / 4) + 1);
      wrLog.innerHTML = logs.slice(Math.max(0, shown - 6), shown).map(([cls, msg], idx, arr) => {
        const n = shown - arr.length + idx;
        const mm = String(Math.floor(n * 3.7)).padStart(2, "0");
        return `<p class="${cls}"><b>00:${mm}</b> ${msg}</p>`;
      }).join("");
    }
  };
  const wrStep = () => {
    wrTick += 1;
    wrRender();
    if (wrTick < 46) wrTimer = setTimeout(wrStep, 380);
    else wrRunning = false;
  };
  const wrStart = () => {
    clearTimeout(wrTimer);
    wrTick = reduced.matches ? 46 : 0;
    wrRender();
    if (!reduced.matches) { wrRunning = true; wrTimer = setTimeout(wrStep, 380); }
  };
  if (warroom) {
    wrRender();
    new IntersectionObserver((entries, obs) => {
      if (entries.some((e) => e.isIntersecting)) { wrStart(); obs.disconnect(); }
    }, { threshold: 0.3 }).observe(warroom);
    $("[data-warroom-replay]")?.addEventListener("click", wrStart);
    onLanguage.push(wrRender);
  }

  /* ---------- platform stepper ---------- */
  const platform = $("[data-platform]");
  const platKeys = ["plat1", "plat2", "plat3", "plat4", "plat5", "plat6"];
  let platStep = 0;
  let platAuto = 0;
  const setPlat = (i) => {
    platStep = i;
    if (!platform) return;
    platform.dataset.step = String(i);
    $$("[data-platform-step]", platform).forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.platformStep) === i)));
    const idx = $("[data-platform-index]", platform);
    const title = $("[data-platform-title]", platform);
    const text = $("[data-platform-text]", platform);
    if (idx) idx.textContent = `${String(i + 1).padStart(2, "0")} / 06`;
    if (title) { title.dataset.i18n = platKeys[i]; title.textContent = t(platKeys[i]); }
    if (text) { text.dataset.i18n = `${platKeys[i]}Text`; text.textContent = t(`${platKeys[i]}Text`); }
  };
  if (platform) {
    $$("[data-platform-step]", platform).forEach((b) => b.addEventListener("click", () => { clearInterval(platAuto); setPlat(Number(b.dataset.platformStep)); }));
    new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        clearInterval(platAuto);
        if (e.isIntersecting && !reduced.matches) platAuto = setInterval(() => setPlat((platStep + 1) % 6), 3200);
      });
    }, { threshold: 0.4 }).observe(platform);
    onLanguage.push(() => setPlat(platStep));
  }

  /* ---------- boundary toggle ---------- */
  const bMap = $("[data-boundary-map]");
  $$("[data-boundary-view]").forEach((b) => b.addEventListener("click", () => {
    $$("[data-boundary-view]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    bMap?.classList.toggle("cross", b.dataset.boundaryView === "cross");
  }));

  /* ---------- exploded stack (scroll-driven) ---------- */
  const exploded = $("[data-exploded]");
  const stack = $("[data-exploded-stack]");
  const narrow = window.matchMedia("(max-width: 720px)");
  let explodeFrame = 0;
  const explode = () => {
    explodeFrame = 0;
    if (!exploded || !stack) return;
    if (reduced.matches) { exploded.setAttribute("data-flat", ""); return; }
    exploded.removeAttribute("data-flat");
    const r = stack.getBoundingClientRect();
    const vh = window.innerHeight;
    const k = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height * (narrow.matches ? 0.2 : 0.5))));
    const e = Math.min(1, Math.max(0, (k - 0.15) / 0.55));
    stack.style.setProperty("--explode", e.toFixed(3));
  };
  if (exploded) {
    explode();
    window.addEventListener("scroll", () => { if (!explodeFrame) explodeFrame = requestAnimationFrame(explode); }, { passive: true });
    reduced.addEventListener("change", explode);
  }

  /* ---------- banner studio: real images + measured QA ---------- */
  const banner = $("[data-banner]");
  const bannerImg = $("[data-banner-img]");
  const bnKeys = {
    tp: ["bnTpEyebrow", "bnTpHead", "bnTpSub", "bnTpCta"],
    al: ["bnAlEyebrow", "bnAlHead", "bnAlSub", "bnAlCta"],
    gm: ["bnGmEyebrow", "bnGmHead", "bnGmSub", "bnGmCta"],
  };
  const lum = (r, g, b) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const parseRgb = (c) => (c.match(/\d+(\.\d+)?/g) ?? [0, 0, 0]).slice(0, 3).map(Number);
  const setQa = (sel, text, ok) => {
    const el = $(sel);
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("ok", ok);
    el.classList.toggle("bad", !ok);
  };
  const measureBanner = () => {
    if (!banner || !bannerImg?.complete || !bannerImg.naturalWidth) return;
    const head = $("[data-banner-head]", banner);
    const bRect = banner.getBoundingClientRect();
    const hRect = head.getBoundingClientRect();
    if (!bRect.width) return;
    // Contrast: sample image pixels under the headline; worst case = pixel closest to the text luminance.
    try {
      const cw = 160;
      const ch = Math.max(1, Math.round(cw * bRect.height / bRect.width));
      const cv = document.createElement("canvas");
      cv.width = cw;
      cv.height = ch;
      const ctx = cv.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(bannerImg, 0, 0, cw, ch);
      const x = Math.max(0, Math.floor((hRect.left - bRect.left) / bRect.width * cw));
      const y = Math.max(0, Math.floor((hRect.top - bRect.top) / bRect.height * ch));
      const w = Math.max(1, Math.min(cw - x, Math.ceil(hRect.width / bRect.width * cw)));
      const hh = Math.max(1, Math.min(ch - y, Math.ceil(hRect.height / bRect.height * ch)));
      const data = ctx.getImageData(x, y, w, hh).data;
      const textL = lum(...parseRgb(getComputedStyle(head).color));
      const lums = [];
      // Include the copy scrim (if any) so the number reflects what readers actually see.
      const scrim = { tp: [3, 36, 66, 0.5] }[banner.dataset.product];
      const mix = (v, k) => (scrim ? v * (1 - scrim[3]) + scrim[k] * scrim[3] : v);
      for (let i = 0; i < data.length; i += 4) lums.push(lum(mix(data[i], 0), mix(data[i + 1], 1), mix(data[i + 2], 2)));
      lums.sort((p, q) => Math.abs(p - textL) - Math.abs(q - textL));
      const worst = lums[Math.floor(lums.length * 0.05)] ?? lums[0];
      const r = ratio(textL, worst);
      setQa("[data-banner-contrast]", `${r.toFixed(1)}:1`, r >= 4.5);
    } catch {
      setQa("[data-banner-contrast]", "—", true);
    }
    // Safe area: every copy element must sit inside a 5% inset.
    const inset = { l: bRect.left + bRect.width * 0.05, r: bRect.right - bRect.width * 0.05, t: bRect.top + bRect.height * 0.05, b: bRect.bottom - bRect.height * 0.05 };
    const inside = $$(".banner-copy > *", banner).every((el) => {
      const r = el.getBoundingClientRect();
      return r.left >= inset.l - 0.5 && r.right <= inset.r + 0.5 && r.top >= inset.t - 0.5 && r.bottom <= inset.b + 0.5;
    });
    setQa("[data-banner-safe]", inside ? t("bnQaPass") : "✕", inside);
    // Type scale: number of distinct font sizes in the copy.
    const sizes = new Set($$(".banner-copy > *", banner).map((el) => Math.round(parseFloat(getComputedStyle(el).fontSize))));
    setQa("[data-banner-type]", `${sizes.size}`, sizes.size <= 4);
  };
  const setBanner = () => {
    if (!banner) return;
    const p = banner.dataset.product;
    const keys = bnKeys[p];
    [["[data-banner-eyebrow]", 0], ["[data-banner-head]", 1], ["[data-banner-sub]", 2], ["[data-banner-cta]", 3]].forEach(([sel, i]) => {
      const el = $(sel, banner);
      if (el) { el.dataset.i18n = keys[i]; el.textContent = t(keys[i]); }
    });
    if (bannerImg) {
      const src = `assets/demo/${p}-${banner.dataset.size}.webp?v=2`;
      if (!bannerImg.src.endsWith(src)) bannerImg.src = src;
      else requestAnimationFrame(measureBanner);
    }
  };
  bannerImg?.addEventListener("load", () => setTimeout(measureBanner, 450));
  $$("[data-banner-product]").forEach((b) => b.addEventListener("click", () => {
    $$("[data-banner-product]").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
    banner.dataset.product = b.dataset.bannerProduct;
    setBanner();
  }));
  $$("[data-banner-size]").forEach((b) => b.addEventListener("click", () => {
    $$("[data-banner-size]").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
    banner.dataset.size = b.dataset.bannerSize;
    setBanner();
  }));
  setBanner();
  onLanguage.push(() => { setBanner(); setTimeout(measureBanner, 60); });
  window.addEventListener("resize", () => setTimeout(measureBanner, 150), { passive: true });

  /* ---------- throughput ---------- */
  const tpVolume = $("[data-tp-volume]");
  let tpRate = 60;
  const tpUpdate = () => {
    if (!tpVolume) return;
    const v = Number(tpVolume.value);
    const hours = v / tpRate;
    const out = $("[data-tp-volume-out]");
    if (out) out.textContent = v.toLocaleString();
    const h = $("[data-tp-hours]");
    if (h) h.textContent = hours.toFixed(1);
    const rate = $("[data-tp-rate]");
    if (rate) rate.textContent = tpRate;
    const bar = $("[data-tp-bar]");
    if (bar) bar.style.width = `${Math.min(100, (hours / (1500 / 47)) * 100)}%`;
  };
  tpVolume?.addEventListener("input", tpUpdate);
  $$("[data-tp-mode]").forEach((b) => b.addEventListener("click", () => {
    $$("[data-tp-mode]").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
    tpRate = Number(b.dataset.tpMode);
    tpUpdate();
  }));
  tpUpdate();

  /* ---------- frames scrubber ---------- */
  const strip = $("[data-frames-strip]");
  const scrubInput = $("[data-frames-scrub]");
  const evWrap = $("[data-frames-events]");
  const frameEvents = [
    { at: 0, ev: "evHook", re: "reHook", f: 1 },
    { at: 45, ev: "evSpin", re: "reSpin", f: 2 },
    { at: 140, ev: "evNear", re: "reNear", f: 3 },
    { at: 190, ev: "evWin", re: "reWin", f: 4 },
    { at: 265, ev: "evEnd", re: "reEnd", f: 5 },
  ];
  const evAt = (v) => frameEvents.reduce((acc, e) => (v >= e.at ? e : acc), frameEvents[0]);
  if (strip) {
    for (let i = 0; i < 10; i += 1) {
      const f = document.createElement("i");
      f.style.backgroundImage = `url(assets/demo/frame-${evAt(i * 30).f}-t.webp)`;
      strip.append(f);
    }
  }
  const renderEvents = () => {
    if (!evWrap) return;
    evWrap.innerHTML = frameEvents.map((e) => `<span style="left:${(e.at / 300) * 100}%" data-at="${e.at}">${t(e.ev)}</span>`).join("");
  };
  const frameUpdate = () => {
    if (!scrubInput) return;
    const v = Number(scrubInput.value);
    const e = evAt(v);
    const time = $("[data-frames-time]");
    if (time) time.textContent = `${(v / 10).toFixed(1)}s`;
    const main = $("[data-frames-main]");
    const want = `assets/demo/frame-${e.f}.webp`;
    if (main && !main.src.endsWith(want)) main.src = want;
    const evEl = $("[data-frames-event]");
    if (evEl) { evEl.dataset.i18n = e.ev; evEl.textContent = t(e.ev); }
    const reEl = $("[data-frames-react]");
    if (reEl) { reEl.dataset.i18n = e.re; reEl.textContent = t(e.re); }
    $$("i", strip ?? document.createElement("div")).forEach((f, i) => f.classList.toggle("on", i === Math.min(9, Math.floor(v / 30))));
    $$("span", evWrap ?? document.createElement("div")).forEach((s) => s.classList.toggle("on", Number(s.dataset.at) === e.at));
  };
  if (scrubInput) {
    renderEvents();
    scrubInput.addEventListener("input", frameUpdate);
    frameUpdate();
    let autoplay = 0;
    new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        clearInterval(autoplay);
        if (!en.isIntersecting || reduced.matches) return;
        autoplay = setInterval(() => {
          if (document.activeElement === scrubInput) return;
          scrubInput.value = String((Number(scrubInput.value) + 2) % 301);
          frameUpdate();
        }, 60);
      });
    }, { threshold: 0.5 }).observe(scrubInput.closest("[data-frames]"));
    scrubInput.addEventListener("pointerdown", () => scrubInput.focus());
    onLanguage.push(() => { renderEvents(); frameUpdate(); });
  }

  /* ---------- parallel crawl board ---------- */
  const crawl = $("[data-crawl]");
  if (crawl) {
    const grid = $("[data-crawl-grid]", crawl);
    const lanesEl = $("[data-crawl-lanes]", crawl);
    const N = 200;
    let workers = 12;
    let sites = [];
    let clock = 0;
    let timer = 0;
    let seedState = 7;
    const rnd = () => { seedState = (seedState * 16807) % 2147483647; return seedState / 2147483647; };
    const tiles = [];
    for (let i = 0; i < N; i += 1) {
      const el = document.createElement("i");
      grid.append(el);
      tiles.push(el);
    }
    const reset = () => {
      seedState = 7;
      clock = 0;
      sites = Array.from({ length: N }, () => ({
        state: "queue",
        capture: 8 + Math.round(rnd() * 18),
        read: 4 + Math.round(rnd() * 8),
        flaky: rnd() < 0.07,
        unsure: rnd() < 0.045,
        left: 0,
        worker: -1,
        retried: false,
      }));
      lanesEl.innerHTML = Array.from({ length: workers }, () => "<span><i></i></span>").join("");
    };
    const render = () => {
      sites.forEach((s, i) => { tiles[i].className = `s-${s.state}`; });
      const lanes = $$("span", lanesEl);
      lanes.forEach((lane, w) => {
        const s = sites.find((x) => x.worker === w && (x.state === "capture" || x.state === "read"));
        lane.classList.toggle("busy", Boolean(s));
        const bar = lane.firstElementChild;
        if (bar) bar.style.width = s ? `${Math.max(6, 100 - (s.left / (s.state === "capture" ? s.capture : s.read)) * 100)}%` : "0%";
      });
      const done = sites.filter((s) => s.state === "done").length;
      $("[data-crawl-done]", crawl).textContent = `${done} / ${N}`;
      $("[data-crawl-retry]", crawl).textContent = String(sites.filter((s) => s.retried).length);
      $("[data-crawl-review]", crawl).textContent = String(sites.filter((s) => s.state === "review").length);
      const m = Math.floor(clock / 60);
      $("[data-crawl-clock]", crawl).textContent = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    };
    const step = () => {
      clock += 3;
      const busy = new Set(sites.filter((s) => s.state === "capture" || s.state === "read").map((s) => s.worker));
      for (let w = 0; w < workers; w += 1) {
        if (busy.has(w)) continue;
        const next = sites.find((s) => s.state === "queue");
        if (!next) break;
        next.state = "capture";
        next.left = next.capture;
        next.worker = w;
        busy.add(w);
      }
      sites.forEach((s) => {
        if (s.state !== "capture" && s.state !== "read") return;
        s.left -= 3;
        if (s.left > 0) return;
        if (s.state === "capture") {
          if (s.flaky && !s.retried) { s.retried = true; s.state = "queue"; s.worker = -1; return; }
          s.state = "read";
          s.left = s.read;
        } else {
          s.state = s.unsure ? "review" : "done";
          s.worker = -1;
        }
      });
      render();
      const active = sites.some((s) => s.state === "queue" || s.state === "capture" || s.state === "read");
      if (active) timer = setTimeout(step, 70);
    };
    const run = () => {
      clearTimeout(timer);
      reset();
      if (reduced.matches) {
        while (sites.some((s) => s.state === "queue" || s.state === "capture" || s.state === "read")) {
          clock += 3;
          const before = clearTimeout;
          before(timer);
          // run the same logic synchronously without scheduling
          const busy = new Set(sites.filter((s) => s.state === "capture" || s.state === "read").map((s) => s.worker));
          for (let w = 0; w < workers; w += 1) {
            if (busy.has(w)) continue;
            const next = sites.find((s) => s.state === "queue");
            if (!next) break;
            next.state = "capture"; next.left = next.capture; next.worker = w; busy.add(w);
          }
          sites.forEach((s) => {
            if (s.state !== "capture" && s.state !== "read") return;
            s.left -= 3;
            if (s.left > 0) return;
            if (s.state === "capture") {
              if (s.flaky && !s.retried) { s.retried = true; s.state = "queue"; s.worker = -1; return; }
              s.state = "read"; s.left = s.read;
            } else { s.state = s.unsure ? "review" : "done"; s.worker = -1; }
          });
        }
        render();
        return;
      }
      render();
      timer = setTimeout(step, 120);
    };
    $$("[data-crawl-workers]", crawl).forEach((b) => b.addEventListener("click", () => {
      $$("[data-crawl-workers]", crawl).forEach((x) => x.setAttribute("aria-checked", String(x === b)));
      workers = Number(b.dataset.crawlWorkers);
      run();
    }));
    $("[data-crawl-run]", crawl)?.addEventListener("click", run);
    reset();
    render();
    new IntersectionObserver((entries, obs) => {
      if (entries.some((e) => e.isIntersecting)) { run(); obs.disconnect(); }
    }, { threshold: 0.35 }).observe(crawl);
  }

  /* ---------- atlas: skills x projects on two axes ---------- */
  const atlas = $("[data-atlas]");
  if (atlas) {
    const N = (id, kind, x, y, zh, en, dz = "", de = "") => ({ id, kind, x, y, zh, en, dz, de });
    const nodes = [
      N("stake", "skill", 190, 95, "跨部門協調", "Stakeholder alignment"),
      N("adopt", "skill", 300, 62, "導入與教育", "Adoption & enablement"),
      N("comms", "skill", 70, 150, "內容與溝通", "Content & communication"),
      N("req", "skill", 370, 150, "需求拆解", "Problem framing"),
      N("budget", "skill", 110, 250, "採購與成本", "Procurement & cost"),
      N("accept", "skill", 400, 260, "驗收標準", "Acceptance criteria"),
      N("gov", "skill", 150, 390, "權限與治理規則", "Access & governance rules"),
      N("osint", "skill", 70, 500, "市場研究", "Market research"),
      N("kb", "skill", 330, 565, "知識庫與本體論", "Knowledge base & ontology"),
      N("gates", "skill", 455, 505, "品質閘門與測試", "Quality gates & testing"),
      N("orch", "skill", 590, 395, "多代理編排", "Multi-agent orchestration"),
      N("agent", "skill", 640, 245, "代理設計", "Agent design"),
      N("front", "skill", 800, 95, "互動前端", "Interactive front end"),
      N("imgauto", "skill", 900, 190, "影像軟體自動化", "Image-software automation"),
      N("vision", "skill", 905, 320, "視覺辨識", "Computer vision"),
      N("browser", "skill", 880, 455, "瀏覽器與 App 自動化", "Browser & app automation"),
      N("onprem", "skill", 745, 545, "地端模型部署", "On-prem model deployment"),
      N("data", "skill", 640, 600, "資料管線", "Data pipelines"),
      N("p_adopt", "project", 225, 190, "部門 AI 導入", "Department AI rollout", "168 張工單交付、50+ 個內部代理上線、30 天活躍率 73%。", "168 tickets delivered, 50+ internal agents, 73% 30-day active rate."),
      N("p_govplat", "project", 270, 445, "AI 治理平台", "AI governance platform", "用量、成本、身分放在同一個管理畫面，依角色決定能看到什麼。", "Usage, cost and identity in one view, scoped by role."),
      N("p_bench", "project", 420, 405, "有額度的 LLM 工作台", "LLM workbench with quotas", "模型呼叫走伺服器代理：帳號核准、每日額度、一鍵停用。", "Model calls via a server proxy: approved accounts, daily quotas, one-click kill switch."),
      N("p_foreman", "project", 520, 310, "代理監工與戰情室", "Agent foreman & war room", "代理全天候施工，閘門把關，一天只批准一次，面板看得到每個代理。", "Agents build around the clock behind gates, one approval a day, every agent visible on a panel."),
      N("p_proto", "project", 650, 150, "對話原型平台", "Prompt-to-prototype platform", "企劃打一段話，就能在隔離環境玩到遊戲原型。", "A designer types a few lines and plays a prototype built in isolation."),
      N("p_creative", "project", 790, 280, "素材產線", "Creative pipeline", "四個品牌、1,400+ 項交付，平均每小時約 60 項。", "Four brands, 1,400+ deliverables, about 60 an hour."),
      N("p_intel", "project", 760, 405, "競品情報與曝光稽核", "Competitor intel & exposure audit", "每天平行巡 200+ 個站台和 App，失敗就阻斷，不發錯的報表。", "Sweeps 200+ sites and apps in parallel daily; fails closed instead of shipping a wrong report."),
      N("p_assist", "project", 610, 495, "地端商務助手", "On-prem business assistant", "合約、提醒、任務都在公司機房裡處理，雲端只碰合成資料。", "Contracts, reminders and tasks handled on company servers; the cloud only sees synthetic data."),
      N("p_video", "project", 500, 590, "影片拆解知識庫", "Video breakdown knowledge base", "580+ 支廣告逐格拆成事件，新片開工前先查。", "580+ ads broken into events frame by frame, looked up before a new ad starts."),
      N("p_anim", "project", 905, 575, "動畫管線", "Animation pipeline", "一張插畫做成骨骼動畫，自動檢查讓迭代越來越少。", "One illustration to skeletal animation, with checks that cut down iterations."),
    ];
    const edges = {
      p_adopt: ["req", "stake", "adopt", "budget", "accept", "comms"],
      p_govplat: ["gov", "data", "budget", "accept", "browser"],
      p_bench: ["gov", "agent", "front", "budget"],
      p_foreman: ["orch", "gates", "agent", "gov", "front"],
      p_proto: ["agent", "kb", "front", "gates", "req", "orch"],
      p_creative: ["imgauto", "vision", "orch", "gates", "kb", "req"],
      p_intel: ["browser", "vision", "data", "gates", "osint", "req"],
      p_assist: ["onprem", "gov", "data", "agent", "accept"],
      p_video: ["kb", "vision", "data", "orch"],
      p_anim: ["imgauto", "gates", "front"],
    };
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const links = [];
    Object.entries(edges).forEach(([p, ss]) => ss.forEach((s) => links.push([p, s])));
    const neighbors = (id) => links.filter(([a, b]) => a === id || b === id).map(([a, b]) => (a === id ? b : a));
    const svgNS = "http://www.w3.org/2000/svg";
    const gE = $("[data-atlas-edges]", atlas);
    const gN = $("[data-atlas-nodes]", atlas);
    let selected = "";
    let filter = "all";
    const draw = () => {
      const L = lang();
      gE.innerHTML = "";
      gN.innerHTML = "";
      links.forEach(([a, b]) => {
        const A = byId[a];
        const B = byId[b];
        const p = document.createElementNS(svgNS, "path");
        const mx = (A.x + B.x) / 2;
        const my = (A.y + B.y) / 2 - 18;
        p.setAttribute("d", `M${A.x} ${A.y} Q${mx} ${my} ${B.x} ${B.y}`);
        p.dataset.a = a;
        p.dataset.b = b;
        gE.append(p);
      });
      nodes.forEach((n) => {
        const g = document.createElementNS(svgNS, "g");
        g.setAttribute("class", `atlas-node ${n.kind}`);
        g.setAttribute("tabindex", "0");
        g.setAttribute("role", "button");
        g.dataset.id = n.id;
        const label = L === "en" ? n.en : n.zh;
        g.setAttribute("aria-label", label);
        const shape = n.kind === "project" ? document.createElementNS(svgNS, "rect") : document.createElementNS(svgNS, "circle");
        if (n.kind === "project") {
          shape.setAttribute("x", n.x - 9); shape.setAttribute("y", n.y - 9); shape.setAttribute("width", 18); shape.setAttribute("height", 18); shape.setAttribute("rx", 3);
        } else {
          shape.setAttribute("cx", n.x); shape.setAttribute("cy", n.y); shape.setAttribute("r", 7);
        }
        const t = document.createElementNS(svgNS, "text");
        const right = n.x < 860;
        t.setAttribute("x", right ? n.x + 15 : n.x - 15);
        t.setAttribute("y", n.y + 5);
        t.setAttribute("text-anchor", right ? "start" : "end");
        t.textContent = label;
        g.append(shape, t);
        const pick = () => select(n.id);
        g.addEventListener("click", pick);
        g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
        g.addEventListener("pointerenter", () => hover(n.id));
        g.addEventListener("pointerleave", () => hover(""));
        gN.append(g);
      });
      paint();
      detail();
    };
    let hovered = "";
    const hover = (id) => { hovered = id; paint(); };
    const paint = () => {
      const focus = hovered || selected;
      const near = focus ? new Set([focus, ...neighbors(focus)]) : null;
      $$(".atlas-node", gN).forEach((g) => {
        const n = byId[g.dataset.id];
        const filtered = filter !== "all" && n.kind !== filter;
        g.classList.toggle("dim", Boolean((near && !near.has(n.id)) || filtered));
        g.classList.toggle("on", n.id === focus);
      });
      $$("path", gE).forEach((p) => {
        const hot = focus && (p.dataset.a === focus || p.dataset.b === focus);
        p.classList.toggle("hot", Boolean(hot));
        p.classList.toggle("dim", Boolean(focus && !hot) || filter !== "all");
      });
    };
    const detail = () => {
      const L = lang();
      const kindEl = $("[data-atlas-kind]", atlas);
      const nameEl = $("[data-atlas-name]", atlas);
      const descEl = $("[data-atlas-desc]", atlas);
      const list = $("[data-atlas-links]", atlas);
      if (!selected) {
        kindEl.dataset.i18n = "atlasHint"; kindEl.textContent = t("atlasHint");
        nameEl.textContent = "—";
        descEl.dataset.i18n = "atlasHintText"; descEl.textContent = t("atlasHintText");
        list.innerHTML = "";
        return;
      }
      const n = byId[selected];
      delete kindEl.dataset.i18n;
      delete descEl.dataset.i18n;
      kindEl.textContent = t(n.kind === "project" ? "atlasKindProject" : "atlasKindSkill");
      nameEl.textContent = L === "en" ? n.en : n.zh;
      const nb = neighbors(n.id);
      descEl.textContent = n.kind === "project" ? (L === "en" ? n.de : n.dz) : t("atlasSkillUsed").replace("{n}", String(nb.length));
      list.innerHTML = "";
      nb.forEach((id) => {
        const li = document.createElement("li");
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = L === "en" ? byId[id].en : byId[id].zh;
        b.className = byId[id].kind;
        b.addEventListener("click", () => select(id));
        li.append(b);
        list.append(li);
      });
    };
    const select = (id) => { selected = selected === id ? "" : id; paint(); detail(); };
    $$("[data-atlas-filter]", atlas).forEach((b) => b.addEventListener("click", () => {
      $$("[data-atlas-filter]", atlas).forEach((x) => x.setAttribute("aria-checked", String(x === b)));
      filter = b.dataset.atlasFilter;
      paint();
    }));
    draw();
    onLanguage.push(draw);
  }

  /* ---------- speed bands (scroll-linked, opposite directions) ---------- */
  const bands = $$("[data-speed-band]");
  let bandFrame = 0;
  const moveBands = () => {
    bandFrame = 0;
    bands.forEach((band) => {
      const r = band.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) return;
      const k = (innerHeight - r.top) / (innerHeight + r.height);
      $$(".band-row", band).forEach((row) => {
        const dir = Number(row.dataset.bandDir);
        row.style.transform = `translate3d(${(dir * (k * 30 - 15)).toFixed(2)}%,0,0)`;
      });
    });
  };
  if (bands.length && !reduced.matches) {
    moveBands();
    window.addEventListener("scroll", () => { if (!bandFrame) bandFrame = requestAnimationFrame(moveBands); }, { passive: true });
  }

  /* ---------- signature draws itself when the footer appears ---------- */
  const signature = $("[data-signature]");
  if (signature) {
    new IntersectionObserver((entries, obs) => {
      if (entries.some((e) => e.isIntersecting)) { signature.classList.add("drawn"); obs.disconnect(); }
    }, { threshold: 0.6 }).observe(signature);
  }
})();
