document.body.classList.add("js-ready");

const header = document.querySelector("[data-header]");
const menuButton = document.querySelector("[data-menu-button]");
const menu = document.querySelector("[data-menu]");
const modeToggle = document.querySelector("[data-mode-toggle]");
const languageButtons = [...document.querySelectorAll("[data-language]")];
const translations = window.NING_TRANSLATIONS ?? {};
const heroPortrait = document.querySelector("[data-hero-portrait]");
const heroPortraitImage = heroPortrait?.querySelector("img");
const navLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
const telemetryProgress = document.querySelector("[data-telemetry-progress]");
const progressLinks = [...document.querySelectorAll("[data-progress-link]")];
const progressFill = document.querySelector("[data-progress-fill]");
const progressIndex = document.querySelector("[data-progress-index]");
const progressPercent = document.querySelector("[data-progress-percent]");
const progressStatus = document.querySelector("[data-progress-status]");
const evidenceDrawers = [...document.querySelectorAll("[data-evidence-drawer]")];
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

const loadHeroShader = () => {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (document.querySelector('script[data-lazy-shader]')) return;
  const script = document.createElement("script");
  script.src = "hero-shader.js?v=20260812-2";
  script.dataset.lazyShader = "";
  document.head.append(script);
};

if ("requestIdleCallback" in window) requestIdleCallback(loadHeroShader, { timeout: 1400 });
else window.setTimeout(loadHeroShader, 700);

const setMetaContent = (selector, value) => {
  const element = document.querySelector(selector);
  if (element && value) element.setAttribute("content", value);
};

const applyLanguage = (language, persist = true) => {
  const normalized = language === "en" ? "en" : "zh";
  const copy = translations[normalized];
  if (!copy) return;

  document.documentElement.lang = normalized === "zh" ? "zh-Hant" : "en";
  document.body.dataset.language = normalized;
  document.title = copy.pageTitle;
  setMetaContent('meta[name="description"]', copy.metaDescription);
  setMetaContent('meta[property="og:title"]', copy.ogTitle);
  setMetaContent('meta[property="og:description"]', copy.ogDescription);

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = copy[element.dataset.i18n];
    if (value !== undefined) element.textContent = value;
  });
  document.querySelectorAll("[data-i18n-html]").forEach((element) => {
    const value = copy[element.dataset.i18nHtml];
    if (value !== undefined) element.innerHTML = value;
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
    const value = copy[element.dataset.i18nAria];
    if (value !== undefined) element.setAttribute("aria-label", value);
  });

  languageButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.language === normalized));
  });

  if (persist) {
    try { localStorage.setItem("ning-language", normalized); } catch {}
  }
};

let savedLanguage = "zh";
try { savedLanguage = localStorage.getItem("ning-language") || "zh"; } catch {}
const requestedLanguage = new URLSearchParams(window.location.search).get("lang");
applyLanguage(requestedLanguage || savedLanguage, false);

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyLanguage(button.dataset.language);
    activeChapterId = "";
    queueTelemetryProgress();
  });
});

const revealPortrait = () => requestAnimationFrame(() => heroPortrait?.classList.add("portrait-ready"));
if (heroPortraitImage?.complete) revealPortrait();
else {
  heroPortraitImage?.addEventListener("load", revealPortrait, { once: true });
  heroPortraitImage?.addEventListener("error", revealPortrait, { once: true });
}

const setHeaderState = () => header?.classList.toggle("scrolled", window.scrollY > 24);
setHeaderState();
window.addEventListener("scroll", setHeaderState, { passive: true });

menuButton?.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!isOpen));
  menu?.classList.toggle("open", !isOpen);
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    menuButton?.setAttribute("aria-expanded", "false");
    menu?.classList.remove("open");
  });
});

modeToggle?.addEventListener("click", () => {
  const enabled = document.body.dataset.mode === "signal";
  document.body.dataset.mode = enabled ? "" : "signal";
  modeToggle.setAttribute("aria-pressed", String(!enabled));
});

const reflectiveSurfaces = [...document.querySelectorAll("[data-reflective]")];
const precisePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const syncReflectionCapability = () => {
  const enabled = precisePointer.matches && !reducedMotion.matches;
  reflectiveSurfaces.forEach((surface) => {
    surface.classList.toggle("reflection-enabled", enabled);
    if (!enabled) surface.style.setProperty("--reflect-opacity", "0");
  });
  if (!enabled) activeReflectiveSurface = null;
};

let activeReflectiveSurface = null;
let reflectionFrame = 0;
let reflectionPointerX = 0;
let reflectionPointerY = 0;

const renderReflection = () => {
  reflectionFrame = 0;
  if (!activeReflectiveSurface) return;
  const rect = activeReflectiveSurface.getBoundingClientRect();
  activeReflectiveSurface.style.setProperty("--reflect-x", `${reflectionPointerX - rect.left}px`);
  activeReflectiveSurface.style.setProperty("--reflect-y", `${reflectionPointerY - rect.top}px`);
};

document.addEventListener("pointerover", (event) => {
  const surface = event.target.closest?.("[data-reflective]");
  if (!surface?.classList.contains("reflection-enabled")) return;
  if (activeReflectiveSurface !== surface) activeReflectiveSurface?.style.setProperty("--reflect-opacity", "0");
  activeReflectiveSurface = surface;
  surface.style.setProperty("--reflect-opacity", "1");
}, { passive: true });

document.addEventListener("pointermove", (event) => {
  if (!activeReflectiveSurface) return;
  reflectionPointerX = event.clientX;
  reflectionPointerY = event.clientY;
  if (!reflectionFrame) reflectionFrame = requestAnimationFrame(renderReflection);
}, { passive: true });

document.addEventListener("pointerout", (event) => {
  if (!activeReflectiveSurface || event.relatedTarget?.closest?.("[data-reflective]") === activeReflectiveSurface) return;
  activeReflectiveSurface.style.setProperty("--reflect-opacity", "0");
  activeReflectiveSurface = null;
}, { passive: true });

precisePointer.addEventListener("change", syncReflectionCapability);
reducedMotion.addEventListener("change", syncReflectionCapability);
syncReflectionCapability();

const motionZoneObserver = new IntersectionObserver(
  (entries) => entries.forEach((entry) => entry.target.classList.toggle("motion-paused", !entry.isIntersecting)),
  { rootMargin: "180px 0px" },
);
document.querySelectorAll(".motion-zone").forEach((zone) => {
  if (!zone.classList.contains("hero")) zone.classList.add("motion-paused");
  motionZoneObserver.observe(zone);
});

const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -40px" },
);

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

const caseFlowObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("case-active");
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.24, rootMargin: "0px 0px -8%" },
);

document.querySelectorAll("[data-case-flow]").forEach((element) => caseFlowObserver.observe(element));

const chapterObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("chapter-active");
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.08, rootMargin: "0px 0px -18%" },
);

document.querySelectorAll("[data-chapter-frame]").forEach((element) => chapterObserver.observe(element));

const chapterSections = [...document.querySelectorAll("[data-chapter-frame]")];
let activeChapterId = "";
let telemetryFrame = 0;

const setActiveChapter = (chapter) => {
  if (!chapter || chapter.id === activeChapterId) return;
  activeChapterId = chapter.id;
  const chapterPosition = chapterSections.indexOf(chapter);
  progressLinks.forEach((link, index) => {
    const active = link.dataset.progressLink === activeChapterId;
    link.classList.toggle("active", active);
    link.classList.toggle("passed", index < chapterPosition);
    if (active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
  if (progressIndex) progressIndex.textContent = `${String(chapterPosition + 1).padStart(2, "0")} / ${String(chapterSections.length).padStart(2, "0")}`;
  if (progressStatus) progressStatus.textContent = chapter.querySelector(".chapter-register b")?.textContent ?? "";
  telemetryProgress?.style.setProperty("--chapter-bearing", `${chapterPosition * 54}deg`);
};

const renderTelemetryProgress = () => {
  telemetryFrame = 0;
  if (!telemetryProgress || !chapterSections.length) return;
  const pageRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const pageProgress = Math.min(1, Math.max(0, window.scrollY / pageRange));
  const viewportAnchor = window.scrollY + window.innerHeight * .42;
  let activeChapter = chapterSections[0];
  chapterSections.forEach((chapter) => {
    if (chapter.offsetTop <= viewportAnchor) activeChapter = chapter;
  });
  setActiveChapter(activeChapter);
  telemetryProgress.classList.toggle("engaged", window.scrollY > window.innerHeight * .58);
  telemetryProgress.style.setProperty("--page-progress", pageProgress.toFixed(4));
  telemetryProgress.style.setProperty("--scroll-bearing", `${Math.round(pageProgress * 132)}deg`);
  if (progressFill) progressFill.style.transform = `scaleY(${pageProgress})`;
  if (progressPercent) progressPercent.textContent = `${String(Math.round(pageProgress * 100)).padStart(2, "0")}%`;
};

const queueTelemetryProgress = () => {
  if (!telemetryFrame) telemetryFrame = requestAnimationFrame(renderTelemetryProgress);
};

evidenceDrawers.forEach((drawer) => {
  drawer.addEventListener("toggle", () => {
    queueTelemetryProgress();
    window.setTimeout(queueTelemetryProgress, 420);
  });
});

renderTelemetryProgress();
window.addEventListener("scroll", queueTelemetryProgress, { passive: true });
window.addEventListener("resize", queueTelemetryProgress, { passive: true });

const navObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
      });
    });
  },
  { rootMargin: "-35% 0px -55%", threshold: 0 },
);
sections.forEach((section) => navObserver.observe(section));

const year = document.querySelector("[data-year]");
if (year) year.textContent = new Date().getFullYear();
