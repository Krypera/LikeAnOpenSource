import fs from "node:fs";
import path from "node:path";
import { buildEmbeddedManifest } from "./build-embedded-manifest.mjs";

const rootDir = path.resolve(import.meta.dirname, "..");
const indexPath = path.join(rootDir, "index.html");

const manifest = buildEmbeddedManifest(rootDir);
const manifestMarkup = JSON.stringify(manifest, null, 4).replace(/<\/script/gi, "<\\/script");

const indexHtml = fs.readFileSync(indexPath, "utf8");
const replacement = [
    "<!-- EMBEDDED_MANIFEST_START -->",
    '<script id="embedded-manifest" type="application/json">',
    manifestMarkup,
    "</script>",
    "<!-- EMBEDDED_MANIFEST_END -->"
].join("\n");

const markerPattern = /<!-- EMBEDDED_MANIFEST_START -->[\s\S]*?<!-- EMBEDDED_MANIFEST_END -->/;
if (!markerPattern.test(indexHtml)) {
    throw new Error("Embedded manifest markers were not found in index.html.");
}

const nextHtml = indexHtml.replace(markerPattern, replacement);

fs.writeFileSync(indexPath, nextHtml);
console.log(
    nextHtml === indexHtml
        ? "Embedded manifest was already in sync."
        : "Embedded manifest synced into index.html."
);
