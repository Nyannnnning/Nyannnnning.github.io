import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const root = new URL("../", import.meta.url);
const index = await readFile(new URL("index.html", root), "utf8");
const styles = await readFile(new URL("styles.css", root), "utf8");
const script = await readFile(new URL("script.js", root), "utf8");
const translationsSource = await readFile(new URL("translations.js", root), "utf8");

const failures = [];
const requiredIds = ["main", "top", "work", "system", "trajectory", "github"];

for (const id of requiredIds) {
  if (!index.includes(`id="${id}"`)) failures.push(`Missing required id: ${id}`);
}

for (const href of index.matchAll(/href="([^"]+)"/g)) {
  const target = href[1];
  if (target.startsWith("#") && !index.includes(`id="${target.slice(1)}"`)) {
    failures.push(`Broken internal link: ${target}`);
  }
  if (/^(styles\.css|script\.js|translations\.js|favicon\.svg)$/.test(target) && !existsSync(new URL(target, root))) {
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
if (!styles.includes("terminal-flicker")) failures.push("Missing terminal phosphor animation");
if (`${index}\n${translationsSource}`.includes("追蹤 GitHub 整理進度")) failures.push("Stale GitHub CTA copy found");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Site validation passed: links, privacy guards, responsive and motion checks.");
