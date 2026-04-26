import { createHash } from "node:crypto";
import { normalizeLowercaseStringOrEmpty } from "../shared/string-coerce.js";

const SCRIPT_ATTRIBUTE_NAME_RE = /\s([^\s=/>]+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/g;

/**
 * Compute SHA-256 CSP hashes for inline `<script>` blocks in an HTML string.
 * Only scripts without a `src` attribute are considered inline.
 */
export function computeInlineScriptHashes(html: string): string[] {
  const hashes: string[] = [];
  const re = /<script(?:\s[^>]*)?>([^]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const openTag = match[0].slice(0, match[0].indexOf(">") + 1);
    if (hasScriptSrcAttribute(openTag)) {
      continue;
    }
    const content = match[1];
    if (!content) {
      continue;
    }
    const hash = createHash("sha256").update(content, "utf8").digest("base64");
    hashes.push(`sha256-${hash}`);
  }
  return hashes;
}

function hasScriptSrcAttribute(openTag: string): boolean {
  return Array.from(openTag.matchAll(SCRIPT_ATTRIBUTE_NAME_RE)).some(
    (match) => normalizeLowercaseStringOrEmpty(match[1]) === "src",
  );
}

export function buildControlUiCspHeader(opts?: { inlineScriptHashes?: string[] }): string {
  const hashes = opts?.inlineScriptHashes;
  const scriptSrc = hashes?.length
    ? `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cubism.live2d.com https://cdn.jsdelivr.net ${hashes.map((h) => `'${h}'`).join(" ")}`
    : "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cubism.live2d.com https://cdn.jsdelivr.net";
  return [
    "default-src 'self' 'unsafe-eval' 'unsafe-inline' https://cubism.live2d.com https://cdn.jsdelivr.net",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    scriptSrc,
    "style-src 'self' 'unsafe-eval' 'unsafe-inline' https://cubism.live2d.com https://cdn.jsdelivr.net 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' 'unsafe-eval' 'unsafe-inline' https://cubism.live2d.com https://cdn.jsdelivr.net data: https:",
    "font-src 'self' 'unsafe-eval' 'unsafe-inline' https://cubism.live2d.com https://cdn.jsdelivr.net https://fonts.gstatic.com",
    "connect-src 'self' 'unsafe-eval' 'unsafe-inline' https://cubism.live2d.com https://cdn.jsdelivr.net ws: wss:",
  ].join("; ");
}
