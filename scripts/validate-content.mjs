import fs from "node:fs";
import path from "node:path";
import { buildEmbeddedManifest } from "./build-embedded-manifest.mjs";

const rootDir = path.resolve(import.meta.dirname, "..");
const manifestRelativePath = "content/site-content.v1.json";
const requiredMenus = ["home", "explore", "projects", "articles", "guides", "contribute", "about"];
const errors = [];
const recordCache = new Map();

const readFile = (relativePath) => {
    const absolutePath = path.join(rootDir, relativePath);
    return fs.readFileSync(absolutePath, "utf8");
};

const fileExists = (relativePath) => fs.existsSync(path.join(rootDir, relativePath));

const readJson = (relativePath) => {
    try {
        return JSON.parse(readFile(relativePath));
    } catch (error) {
        errors.push(`${relativePath}: invalid JSON. ${error.message}`);
        return null;
    }
};

const ensure = (condition, message) => {
    if (!condition) {
        errors.push(message);
    }
};

const isExternalAssetRef = (value = "") =>
    /^(?:[a-z][a-z\d+\-.]*:)?\/\//i.test(value) || /^data:/i.test(value);

const resolveMarkdownAssetPath = (assetPath, markdownPath = "") => {
    const trimmedAssetPath = typeof assetPath === "string" ? assetPath.trim() : "";
    if (!trimmedAssetPath) {
        return "";
    }

    if (
        isExternalAssetRef(trimmedAssetPath) ||
        trimmedAssetPath.startsWith("#")
    ) {
        return "";
    }

    if (trimmedAssetPath.startsWith("/")) {
        return trimmedAssetPath.replace(/^\/+/, "");
    }

    const normalizedMarkdownPath = typeof markdownPath === "string" ? markdownPath.trim() : "";
    const markdownDirectory = normalizedMarkdownPath.includes("/")
        ? normalizedMarkdownPath.slice(0, normalizedMarkdownPath.lastIndexOf("/") + 1)
        : "";
    const resolvedPath = new URL(trimmedAssetPath, `https://laos.local/${markdownDirectory}`).pathname;
    return resolvedPath.replace(/^\/+/, "");
};

const validateMarkdownAssetRefs = (markdown, markdownPath, sourceLabel) => {
    const imagePattern = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
    let match;

    while ((match = imagePattern.exec(markdown)) !== null) {
        const assetPath = resolveMarkdownAssetPath(match[2], markdownPath);
        if (!assetPath) {
            continue;
        }

        ensure(
            fileExists(assetPath),
            `${sourceLabel}: image asset "${match[2]}" could not be resolved from "${markdownPath}".`
        );
    }
};

const validHashTargets = new Set(requiredMenus.map((menuId) => `content-${menuId}`));

const validateHref = (href, sourceLabel) => {
    if (typeof href !== "string" || !href.trim()) {
        return;
    }

    if (!href.startsWith("#")) {
        return;
    }

    const targetId = href.slice(1);
    ensure(validHashTargets.has(targetId), `${sourceLabel}: missing internal target "${href}".`);
};

const validateCard = (card, sourceLabel, { generatedTargets = [] } = {}) => {
    ensure(card && typeof card === "object", `${sourceLabel}: card must be an object.`);
    ensure(typeof card?.title === "string" && card.title.trim(), `${sourceLabel}: card title is required.`);
    const cardTag = typeof card?.tag === "string" ? card.tag.trim() : "";
    const cardType = typeof card?.type === "string" ? card.type.trim() : "";
    if (cardTag === "Article Topic") {
        ensure(cardType, `${sourceLabel}: article topics must define a top-level type.`);
    }
    if (typeof card?.type !== "undefined") {
        ensure(cardType, `${sourceLabel}: type must be a non-empty string when provided.`);
    }
    if (Array.isArray(card?.details)) {
        card.details.forEach((detail, index) => {
            ensure(detail && typeof detail === "object", `${sourceLabel} detail[${index}]: detail must be an object.`);
            ensure(
                typeof detail?.label === "string" && detail.label.trim(),
                `${sourceLabel} detail[${index}]: label is required.`
            );
            ensure(
                typeof detail?.text === "string" && detail.text.trim(),
                `${sourceLabel} detail[${index}]: text is required.`
            );
        });
    }
    if (typeof card?.href === "string") {
        const targetId = card.href.trim().startsWith("#") ? card.href.trim().slice(1) : "";
        if (!targetId || !generatedTargets.includes(targetId)) {
            validateHref(card.href, sourceLabel);
        }
    }
    if (typeof card?.bodyPath === "string" && card.bodyPath.trim()) {
        const bodyPath = card.bodyPath.trim();
        ensure(fileExists(bodyPath), `${sourceLabel}: body file "${bodyPath}" does not exist.`);
        if (fileExists(bodyPath)) {
            const body = readFile(bodyPath).trim();
            ensure(body.length > 0, `${sourceLabel}: body file "${bodyPath}" is empty.`);
            validateMarkdownAssetRefs(body, bodyPath, sourceLabel);
        }
    }
    if (typeof card?.resourceHref === "string" && card.resourceHref.trim()) {
        ensure(
            typeof card?.resourceLinkLabel === "string" && card.resourceLinkLabel.trim(),
            `${sourceLabel}: resourceLinkLabel is required when resourceHref is provided.`
        );
        validateHref(card.resourceHref, `${sourceLabel} resource`);
    }
};

const loadRecordCollection = (relativePath) => {
    if (recordCache.has(relativePath)) {
        return recordCache.get(relativePath);
    }

    const indexJson = readJson(relativePath);
    if (!indexJson || typeof indexJson !== "object") {
        recordCache.set(relativePath, new Map());
        return recordCache.get(relativePath);
    }

    const records = Array.isArray(indexJson.records) ? indexJson.records : [];
    const recordMap = new Map();

    records.forEach((entry, index) => {
        const sourceLabel = `${relativePath} record[${index}]`;
        ensure(entry && typeof entry === "object", `${sourceLabel}: entry must be an object.`);

        const id = typeof entry?.id === "string" ? entry.id.trim() : "";
        const recordPath = typeof entry?.path === "string" ? entry.path.trim() : "";

        ensure(id, `${sourceLabel}: id is required.`);
        ensure(recordPath, `${sourceLabel}: path is required.`);
        ensure(!recordMap.has(id), `${sourceLabel}: duplicate record id "${id}".`);
        ensure(fileExists(recordPath), `${sourceLabel}: file "${recordPath}" does not exist.`);

        if (!recordPath || !fileExists(recordPath)) {
            return;
        }

        const record = readJson(recordPath);
        if (!record || typeof record !== "object") {
            return;
        }

        const recordId = typeof record.id === "string" ? record.id.trim() : "";
        ensure(recordId === id, `${recordPath}: id must match index id "${id}".`);
        const generatedTargets =
            recordId && typeof record.bodyPath === "string" && record.bodyPath.trim()
                ? [`record-${recordId}`]
                : [];
        generatedTargets.forEach((targetId) => validHashTargets.add(targetId));
        validateCard(record, recordPath, { generatedTargets });
        recordMap.set(id, record);
    });

    recordCache.set(relativePath, recordMap);
    return recordMap;
};

const validateBlock = (block, sourceLabel) => {
    ensure(block && typeof block === "object", `${sourceLabel}: block must be an object.`);

    switch (block?.type) {
        case "paragraphs":
            ensure(Array.isArray(block.items) && block.items.length > 0, `${sourceLabel}: paragraphs block needs items.`);
            break;
        case "list":
            ensure(Array.isArray(block.items) && block.items.length > 0, `${sourceLabel}: list block needs items.`);
            break;
        case "cards":
            ensure(Array.isArray(block.items) && block.items.length > 0, `${sourceLabel}: cards block needs items.`);
            block.items?.forEach((card, index) => validateCard(card, `${sourceLabel} card[${index}]`));
            break;
        case "tags":
            ensure(Array.isArray(block.items) && block.items.length > 0, `${sourceLabel}: tags block needs items.`);
            break;
        case "callout":
            ensure(typeof block.text === "string" && block.text.trim(), `${sourceLabel}: callout text is required.`);
            break;
        case "markdown": {
            const markdownPath = typeof block.path === "string" ? block.path.trim() : "";
            ensure(markdownPath, `${sourceLabel}: markdown path is required.`);
            ensure(fileExists(markdownPath), `${sourceLabel}: markdown file "${markdownPath}" does not exist.`);
            if (markdownPath && fileExists(markdownPath)) {
                const markdown = readFile(markdownPath).trim();
                ensure(markdown.length > 0, `${sourceLabel}: markdown file "${markdownPath}" is empty.`);
                validateMarkdownAssetRefs(markdown, markdownPath, sourceLabel);
            }
            break;
        }
        case "record-feed": {
            const sourcePath = typeof block.sourcePath === "string" ? block.sourcePath.trim() : "";
            const records = Array.isArray(block.records) ? block.records : [];
            const layout = typeof block.layout === "string" ? block.layout.trim() : "cards";
            ensure(sourcePath, `${sourceLabel}: record-feed sourcePath is required.`);
            ensure(
                layout === "cards" || layout === "details",
                `${sourceLabel}: record-feed layout must be "cards" or "details".`
            );
            ensure(fileExists(sourcePath), `${sourceLabel}: record-feed source "${sourcePath}" does not exist.`);

            if (sourcePath && fileExists(sourcePath)) {
                const recordMap = loadRecordCollection(sourcePath);
                if (records.length) {
                    records.forEach((recordId) => {
                        ensure(
                            recordMap.has(recordId),
                            `${sourceLabel}: record "${recordId}" is missing from "${sourcePath}".`
                        );
                    });
                }
            }
            break;
        }
        default:
            errors.push(`${sourceLabel}: unsupported block type "${block?.type}".`);
    }
};

const getGroupById = (section, groupId) =>
    Array.isArray(section?.groups)
        ? section.groups.find((group) => group?.id === groupId)
        : null;

const getRecordFeedBySource = (group, sourcePath) =>
    Array.isArray(group?.blocks)
        ? group.blocks.find(
            (block) =>
                block?.type === "record-feed" &&
                typeof block.sourcePath === "string" &&
                block.sourcePath.trim() === sourcePath
        )
        : null;

const manifest = readJson(manifestRelativePath);

const readEmbeddedManifestFromIndex = () => {
    const indexHtml = readFile("index.html");
    const match = indexHtml.match(
        /<!-- EMBEDDED_MANIFEST_START -->[\s\S]*?<script id="embedded-manifest" type="application\/json">([\s\S]*?)<\/script>[\s\S]*?<!-- EMBEDDED_MANIFEST_END -->/
    );

    if (!match) {
        errors.push("index.html: embedded manifest block is missing.");
        return null;
    }

    try {
        return JSON.parse(match[1].trim());
    } catch (error) {
        errors.push(`index.html: embedded manifest JSON is invalid. ${error.message}`);
        return null;
    }
};

if (manifest && typeof manifest === "object") {
    ensure(manifest.sections && typeof manifest.sections === "object", "Manifest: sections object is required.");

    requiredMenus.forEach((menuId) => {
        const section = manifest.sections?.[menuId];
        ensure(section && typeof section === "object", `Manifest: section "${menuId}" is required.`);

        const groups = Array.isArray(section?.groups) ? section.groups : [];
        groups.forEach((group, groupIndex) => {
            const groupLabel = `${menuId}.groups[${groupIndex}]`;
            const groupId = typeof group?.id === "string" ? group.id.trim() : "";
            const groupTitle = typeof group?.title === "string" ? group.title.trim() : "";

            ensure(groupId, `${groupLabel}: id is required.`);
            ensure(groupTitle, `${groupLabel}: title is required.`);

            if (groupId) {
                ensure(!validHashTargets.has(groupId), `${groupLabel}: duplicate id "${groupId}".`);
                validHashTargets.add(groupId);
            }
        });
    });

    requiredMenus.forEach((menuId) => {
        const section = manifest.sections?.[menuId];
        const groups = Array.isArray(section?.groups) ? section.groups : [];

        groups.forEach((group) => {
            const blocks = Array.isArray(group?.blocks) ? group.blocks : [];
            blocks.forEach((block) => {
                if (block?.type !== "record-feed") {
                    return;
                }

                const sourcePath = typeof block.sourcePath === "string" ? block.sourcePath.trim() : "";
                if (sourcePath && fileExists(sourcePath)) {
                    loadRecordCollection(sourcePath);
                }
            });
        });
    });

    requiredMenus.forEach((menuId) => {
        const section = manifest.sections?.[menuId];
        const groups = Array.isArray(section?.groups) ? section.groups : [];

        groups.forEach((group, groupIndex) => {
            const blocks = Array.isArray(group?.blocks) ? group.blocks : [];
            blocks.forEach((block, blockIndex) => {
                validateBlock(
                    block,
                    `${menuId}.groups[${groupIndex}].blocks[${blockIndex}]`
                );
            });
        });
    });

    const projectsSection = manifest.sections?.projects;
    const publishedProjectGroup = getGroupById(projectsSection, "projects-published-notes");
    ensure(
        publishedProjectGroup,
        'Manifest: section "projects" must define a "projects-published-notes" group.'
    );
    ensure(
        getRecordFeedBySource(publishedProjectGroup, "content/projects/index.json"),
        'Manifest: "projects-published-notes" must include a record-feed for "content/projects/index.json".'
    );

    const articlesSection = manifest.sections?.articles;
    const publishedArticleGroup = getGroupById(articlesSection, "articles-published-library");
    ensure(
        publishedArticleGroup,
        'Manifest: section "articles" must define an "articles-published-library" group.'
    );
    ensure(
        getRecordFeedBySource(publishedArticleGroup, "content/articles/index.json"),
        'Manifest: "articles-published-library" must include a record-feed for "content/articles/index.json".'
    );

    const embeddedManifest = readEmbeddedManifestFromIndex();
    if (embeddedManifest) {
        const expectedEmbeddedManifest = buildEmbeddedManifest(rootDir);
        ensure(
            JSON.stringify(embeddedManifest) === JSON.stringify(expectedEmbeddedManifest),
            'index.html: embedded manifest is out of sync with the generated embedded payload. Run "node scripts/sync-embedded-manifest.mjs".'
        );
    }
}

if (errors.length) {
    console.error("Content validation failed:\n");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
}

console.log("Content validation passed.");
