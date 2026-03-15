#!/usr/bin/env node

/**
 * Fetch URL - Rich web page reader for AI context.
 * Outputs clean markdown with metadata. Designed for LLM consumption.
 */

import { fileURLToPath } from "url";
import path from "path";
import { NodeHtmlMarkdown } from "node-html-markdown";

const DEFAULTS = { timeoutSec: 15, maxChars: 24000 };
const USER_AGENT =
  "Mozilla/5.0 (compatible; ForgeFetch/1.0; +https://github.com/alto9/forge-cursor-plugin)";

/** Parse argv. Returns { url, timeoutSec, maxChars } or null or { help: true }. */
export function parseArgs(argv) {
  if (!Array.isArray(argv) || argv.length < 3) return null;
  const first = argv[2];
  if (first === "-h" || first === "--help") return { help: true };
  const url = first;
  if (!url || typeof url !== "string" || !url.trim()) return null;
  if (!/^https?:\/\//i.test(url.trim())) return null;

  let timeoutSec = DEFAULTS.timeoutSec;
  let maxChars = DEFAULTS.maxChars;

  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--timeout" && argv[i + 1] != null) {
      const v = parseInt(argv[i + 1], 10);
      if (!Number.isInteger(v) || v <= 0) return null;
      timeoutSec = v;
      i++;
    } else if (argv[i] === "--max-chars" && argv[i + 1] != null) {
      const v = parseInt(argv[i + 1], 10);
      if (!Number.isInteger(v) || v <= 0) return null;
      maxChars = v;
      i++;
    } else if (argv[i] === "-h" || argv[i] === "--help") {
      return { help: true };
    } else if (argv[i].startsWith("-")) {
      return null; // unknown flag
    }
  }
  return { url: url.trim(), timeoutSec, maxChars };
}

/** Extract meta from HTML string */
function extractMeta(html, url) {
  const baseUrl = new URL(url);
  const meta = {
    title: "",
    description: "",
    ogTitle: "",
    ogDescription: "",
    canonical: "",
  };

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) meta.title = decodeHtml(titleMatch[1]).replace(/\s+/g, " ").trim();

  const descMatch = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i
  ) || html.match(
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i
  );
  if (descMatch) meta.description = decodeHtml(descMatch[1]).replace(/\s+/g, " ").trim();

  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i);
  if (ogTitle) meta.ogTitle = decodeHtml(ogTitle[1]).replace(/\s+/g, " ").trim();

  const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i);
  if (ogDesc) meta.ogDescription = decodeHtml(ogDesc[1]).replace(/\s+/g, " ").trim();

  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i)
    || html.match(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i);
  if (canonical) meta.canonical = resolveUrl(canonical[1], baseUrl);

  return meta;
}

function decodeHtml(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function resolveUrl(href, base) {
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}

/** Truncate at sentence or paragraph boundary */
function truncateAtBoundary(text, maxChars) {
  if (text.length <= maxChars) return { text, truncated: false };
  const cut = text.slice(0, maxChars);
  const lastPara = cut.lastIndexOf("\n\n");
  const lastSentence = Math.max(
    cut.lastIndexOf(". "),
    cut.lastIndexOf(".\n"),
    cut.lastIndexOf("! "),
    cut.lastIndexOf("? ")
  );
  const breakAt = Math.max(lastPara, lastSentence, maxChars * 0.8);
  return {
    text: (breakAt > maxChars * 0.5 ? cut.slice(0, breakAt + 1) : cut).trim(),
    truncated: true,
  };
}

/** Remove script, style, noscript, svg before conversion */
function stripNoise(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "");
}

/** Prefer <main> or <article> for primary content; falls back to full body */
function extractMainContent(html) {
  const mainMatch = html.match(/<main[\s\S]*?>([\s\S]*?)<\/main>/i);
  if (mainMatch) return mainMatch[1];
  const articleMatch = html.match(/<article[\s\S]*?>([\s\S]*?)<\/article>/i);
  if (articleMatch) return articleMatch[1];
  const bodyMatch = html.match(/<body[\s\S]*?>([\s\S]*?)<\/body>/i);
  if (bodyMatch) return bodyMatch[1];
  return html;
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    if (!html || !html.trim()) throw new Error("Empty response");
    return html;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") throw new Error(`Timed out after ${timeoutMs / 1000}s`);
    throw err;
  }
}

function main() {
  const parsed = parseArgs(process.argv);
  if (!parsed) {
    console.error("Usage: fetch-url.js <url> [--timeout <seconds>] [--max-chars <count>]");
    console.error("  url: HTTP/HTTPS URL to fetch");
    console.error("  --timeout: seconds (default 15)");
    console.error("  --max-chars: max content length (default 24000)");
    process.exit(1);
  }
  if (parsed.help) {
    console.log("Usage: fetch-url.js <url> [--timeout <seconds>] [--max-chars <count>]");
    process.exit(0);
  }

  run(parsed).catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
}

async function run({ url, timeoutSec, maxChars }) {
  const html = await fetchWithTimeout(url, timeoutSec * 1000);
  const meta = extractMeta(html, url);
  const mainHtml = extractMainContent(html);
  const cleaned = stripNoise(mainHtml);
  const markdown = NodeHtmlMarkdown.translate(cleaned, {
    maxConsecutiveNewlines: 2,
    ignore: ["script", "style", "noscript", "svg"],
  });

  const title = meta.ogTitle || meta.title || "";
  const description = meta.ogDescription || meta.description || "";

  const { text: content, truncated } = truncateAtBoundary(markdown.trim(), maxChars);

  const lines = [];
  lines.push(`# ${title || "Untitled"}`);
  lines.push("");
  lines.push(`Source: ${url}`);
  if (meta.canonical && meta.canonical !== url) {
    lines.push(`Canonical: ${meta.canonical}`);
  }
  lines.push("");
  if (description) {
    lines.push(description);
    lines.push("");
  }
  lines.push("---");
  lines.push("");
  lines.push(content || "(No text content extracted)");
  if (truncated) {
    lines.push("");
    lines.push("_[Content truncated]_");
  }

  console.log(lines.join("\n"));
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main();
}
