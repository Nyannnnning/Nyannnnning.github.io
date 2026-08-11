document.body.classList.add("js-ready");

const header = document.querySelector("[data-header]");
const menuButton = document.querySelector("[data-menu-button]");
const menu = document.querySelector("[data-menu]");
const modeToggle = document.querySelector("[data-mode-toggle]");
const languageButtons = [...document.querySelectorAll("[data-language]")];
const translations = window.NING_TRANSLATIONS ?? {};
const navLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

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
  button.addEventListener("click", () => applyLanguage(button.dataset.language));
});

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
