import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const root = new URL("../", import.meta.url);
const index = await readFile(new URL("index.html", root), "utf8");
const styles = await readFile(new URL("styles.css", root), "utf8");
const script = await readFile(new URL("script.js", root), "utf8");
const heroShader = await readFile(new URL("hero-shader.js", root), "utf8");
const telemetry = await readFile(new URL("assets/telemetry.svg", root), "utf8");
const translationsSource = await readFile(new URL("translations.js", root), "utf8");

const failures = [];
const requiredIds = ["main", "top", "work", "system", "trajectory", "github"];

for (const id of requiredIds) {
  if (!index.includes(`id="${id}"`)) failures.push(`Missing required id: ${id}`);
}

for (const reference of index.matchAll(/(?:href|src)="([^"]+)"/g)) {
  const target = reference[1];
  const localTarget = target.split(/[?#]/, 1)[0];
  if (target.startsWith("#") && !index.includes(`id="${target.slice(1)}"`)) {
    failures.push(`Broken internal link: ${target}`);
  }
  if ((/^(styles\.css|script\.js|hero-shader\.js|translations\.js|favicon\.svg)$/.test(localTarget) || localTarget.startsWith("assets/")) && !existsSync(new URL(localTarget, root))) {
    failures.push(`Missing local asset: ${target}`);
  }
}

const privatePatterns = ["192.168.", "ai-gw-02", "i17game.net", "token=", "password="];
for (const pattern of privatePatterns) {
  if (index.toLowerCase().includes(pattern.toLowerCase())) {
    failures.push(`Potential private value found: ${pattern}`);
  }
}

const deprecatedBrandPhrases = ["AI-native Product & System Architect", "AI-native product thinking"];
for (const phrase of deprecatedBrandPhrases) {
  if (`${index}\n${translationsSource}`.includes(phrase)) failures.push(`Deprecated brand phrase found: ${phrase}`);
}

const translationKeys = new Set([
  ...index.matchAll(/data-i18n(?:-html|-aria)?="([^"]+)"/g),
].map((match) => match[1]));
for (const key of translationKeys) {
  const pattern = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\s*:`);
  const matches = translationsSource.match(new RegExp(pattern.source, "g")) ?? [];
  if (matches.length < 2) failures.push(`Translation key is missing from one or more languages: ${key}`);
}

if (!styles.includes("@media (max-width: 1180px)")) failures.push("Missing compact-desktop breakpoint");
if (!styles.includes("@media (max-width: 900px)")) failures.push("Missing tablet breakpoint");
if (!styles.includes("@media (max-width: 720px)")) failures.push("Missing mobile breakpoint");
if (!styles.includes("prefers-reduced-motion")) failures.push("Missing reduced-motion support");
if (!script.includes("IntersectionObserver")) failures.push("Missing progressive reveal behavior");
if (!script.includes("applyLanguage")) failures.push("Missing language switching behavior");
if ((index.match(/data-reflective/g) ?? []).length < 9) failures.push("Missing reflective interaction surfaces");
if (!script.includes("requestAnimationFrame(renderReflection)")) failures.push("Missing frame-synced reflection behavior");
if (!styles.includes("terminal-flicker")) failures.push("Missing terminal phosphor animation");
if (!styles.includes("instrument-scan")) failures.push("Missing instrument reflection scan");
if (!index.includes("data-hero-shader")) failures.push("Missing hero shader canvas");
if (!heroShader.includes('getContext("webgl"')) failures.push("Missing native WebGL hero shader");
if (!heroShader.includes("webglcontextlost")) failures.push("Missing WebGL fallback handling");
if (!heroShader.includes("prefers-reduced-motion")) failures.push("Missing shader reduced-motion fallback");
if (!styles.includes("--frost-silver")) failures.push("Missing translucent silver surface system");
if (!styles.includes("--frost-shadow")) failures.push("Missing frosted surface depth system");
if ((index.match(/data-case-flow/g) ?? []).length !== 3) failures.push("Missing case narrative hooks");
if (!script.includes("caseFlowObserver")) failures.push("Missing case flow observer");
if (!styles.includes("flow-materialize")) failures.push("Missing staged case flow animation");
if (!styles.includes("governance-route")) failures.push("Missing governance routing visual system");
if (!index.includes("data-hero-portrait")) failures.push("Missing hero portrait layer");
if (!styles.includes("portrait-sheen")) failures.push("Missing masked portrait material pass");
if ((index.match(/data-chapter-frame/g) ?? []).length !== 5) failures.push("Missing editorial chapter frames");
if (!script.includes("chapterObserver")) failures.push("Missing chapter transition observer");
if (!styles.includes("chapter-register")) failures.push("Missing editorial chapter register system");
if (!styles.includes("@keyframes radar-sweep")) failures.push("Missing cockpit radar sweep treatment");
if (`${index}\n${translationsSource}`.includes("NING.FDE")) failures.push("Overstated FDE wordmark found");
if (!translationsSource.includes('class="hero-focus">field friction</strong>')) failures.push("Missing deliberate English hero hierarchy");
if (!styles.includes(".hero h1 .hero-focus")) failures.push("Missing hero title hierarchy styles");
if (!index.includes('class="radar-rig reveal"')) failures.push("Missing integrated cockpit radar rig");
for (const symbol of ["reticle", "waveform", "bearing", "nodes", "calibration", "radar-frame", "umbilical"]) {
  if (!telemetry.includes(`id="${symbol}"`)) failures.push(`Missing telemetry symbol: ${symbol}`);
}
if ((index.match(/class="telemetry-glyph/g) ?? []).length !== 5) failures.push("Missing chapter telemetry glyph system");
if (!styles.includes("border-radius: 18px 18px 28px 18px")) failures.push("Missing rounded case module treatment");
if (`${index}\n${translationsSource}`.includes("追蹤 GitHub 整理進度")) failures.push("Stale GitHub CTA copy found");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Site validation passed: links, privacy guards, responsive and motion checks.");
