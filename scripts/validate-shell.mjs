import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const errors = [];
const siteOrigin = "https://likeanopensource.com";
const siteRootUrl = `${siteOrigin}/`;

const readFile = (relativePath) => {
    const absolutePath = path.join(rootDir, relativePath);
    return fs.readFileSync(absolutePath, "utf8");
};

const fileExists = (relativePath) => fs.existsSync(path.join(rootDir, relativePath));

const ensure = (condition, message) => {
    if (!condition) {
        errors.push(message);
    }
};

const indexHtml = readFile("index.html");
const manifestJson = JSON.parse(readFile("site.webmanifest"));
const robotsTxt = readFile("robots.txt");
const sitemapXml = readFile("sitemap.xml");

const expectMetaTag = (pattern, message) => {
    ensure(pattern.test(indexHtml), `index.html: ${message}`);
};

expectMetaTag(
    /<meta\s+name="description"\s+content="[^"]+"/i,
    'missing a non-empty description meta tag.'
);
expectMetaTag(
    /<meta\s+property="og:title"\s+content="[^"]+"/i,
    'missing a non-empty Open Graph title.'
);
expectMetaTag(
    /<meta\s+property="og:description"\s+content="[^"]+"/i,
    'missing a non-empty Open Graph description.'
);
expectMetaTag(
    /<meta\s+name="twitter:card"\s+content="summary"/i,
    'missing the Twitter summary card metadata.'
);
expectMetaTag(
    new RegExp(`<meta\\s+property="og:url"\\s+content="${siteRootUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "i"),
    `missing or invalid Open Graph URL for "${siteRootUrl}".`
);
expectMetaTag(
    /<link\s+rel="icon"\s+href="([^"]+)"/i,
    'missing the favicon link.'
);
expectMetaTag(
    /<link\s+rel="manifest"\s+href="([^"]+)"/i,
    'missing the web manifest link.'
);
expectMetaTag(
    new RegExp(`<link\\s+rel="canonical"\\s+href="${siteRootUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "i"),
    `missing or invalid canonical URL for "${siteRootUrl}".`
);

const faviconMatch = indexHtml.match(/<link\s+rel="icon"\s+href="([^"]+)"/i);
if (faviconMatch) {
    ensure(fileExists(faviconMatch[1]), `index.html: linked favicon "${faviconMatch[1]}" does not exist.`);
}

const webManifestMatch = indexHtml.match(/<link\s+rel="manifest"\s+href="([^"]+)"/i);
if (webManifestMatch) {
    ensure(
        fileExists(webManifestMatch[1]),
        `index.html: linked web manifest "${webManifestMatch[1]}" does not exist.`
    );
}

const structuredDataMatch = indexHtml.match(
    /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/i
);
ensure(structuredDataMatch, "index.html: missing JSON-LD website metadata.");
if (structuredDataMatch) {
    try {
        const structuredData = JSON.parse(structuredDataMatch[1].trim());
        ensure(
            structuredData?.["@type"] === "WebSite",
            'index.html: JSON-LD must describe a "WebSite".'
        );
        ensure(
            structuredData?.url === siteRootUrl,
            `index.html: JSON-LD url must be "${siteRootUrl}".`
        );
        ensure(
            typeof structuredData?.name === "string" && structuredData.name.trim(),
            "index.html: JSON-LD name is required."
        );
    } catch (error) {
        errors.push(`index.html: JSON-LD is invalid. ${error.message}`);
    }
}

ensure(
    typeof manifestJson.name === "string" && manifestJson.name.trim(),
    "site.webmanifest: name is required."
);
ensure(
    typeof manifestJson.short_name === "string" && manifestJson.short_name.trim(),
    "site.webmanifest: short_name is required."
);
ensure(
    typeof manifestJson.description === "string" && manifestJson.description.trim(),
    "site.webmanifest: description is required."
);
ensure(
    typeof manifestJson.start_url === "string" && manifestJson.start_url.trim(),
    "site.webmanifest: start_url is required."
);
ensure(
    manifestJson.id === "/",
    'site.webmanifest: id should be "/".'
);
ensure(
    manifestJson.scope === "/",
    'site.webmanifest: scope should be "/".'
);
ensure(
    typeof manifestJson.display === "string" && manifestJson.display.trim(),
    "site.webmanifest: display is required."
);
ensure(
    typeof manifestJson.background_color === "string" && manifestJson.background_color.trim(),
    "site.webmanifest: background_color is required."
);
ensure(
    typeof manifestJson.theme_color === "string" && manifestJson.theme_color.trim(),
    "site.webmanifest: theme_color is required."
);
ensure(
    Array.isArray(manifestJson.icons) && manifestJson.icons.length > 0,
    "site.webmanifest: at least one icon is required."
);

if (Array.isArray(manifestJson.icons)) {
    manifestJson.icons.forEach((icon, index) => {
        ensure(icon && typeof icon === "object", `site.webmanifest icon[${index}]: icon must be an object.`);
        ensure(
            typeof icon?.src === "string" && icon.src.trim(),
            `site.webmanifest icon[${index}]: src is required.`
        );
        if (typeof icon?.src === "string" && icon.src.trim()) {
            ensure(
                fileExists(icon.src.trim()),
                `site.webmanifest icon[${index}]: file "${icon.src.trim()}" does not exist.`
            );
        }
    });
}

ensure(/User-agent:\s*\*/i.test(robotsTxt), 'robots.txt: missing "User-agent: *".');
ensure(/Allow:\s*\//i.test(robotsTxt), 'robots.txt: missing "Allow: /".');
ensure(
    robotsTxt.includes(`Sitemap: ${siteOrigin}/sitemap.xml`),
    `robots.txt: missing sitemap declaration for "${siteOrigin}/sitemap.xml".`
);

ensure(
    sitemapXml.includes("<urlset"),
    "sitemap.xml: missing urlset root element."
);
ensure(
    sitemapXml.includes(`<loc>${siteRootUrl}</loc>`),
    `sitemap.xml: missing root URL "${siteRootUrl}".`
);

if (errors.length) {
    console.error("Shell validation failed:\n");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
}

console.log("Shell validation passed.");
