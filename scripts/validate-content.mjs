import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const manifestRelativePath = "content/site-content.v1.json";
const requiredMenus = ["home", "explore", "projects", "articles", "guides", "about"];
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

const validateCard = (card, sourceLabel) => {
    ensure(card && typeof card === "object", `${sourceLabel}: card must be an object.`);
    ensure(typeof card?.title === "string" && card.title.trim(), `${sourceLabel}: card title is required.`);
    if (typeof card?.href === "string") {
        validateHref(card.href, sourceLabel);
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
        validateCard(record, recordPath);
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
            }
            break;
        }
        case "record-feed": {
            const sourcePath = typeof block.sourcePath === "string" ? block.sourcePath.trim() : "";
            const records = Array.isArray(block.records) ? block.records : [];
            ensure(sourcePath, `${sourceLabel}: record-feed sourcePath is required.`);
            ensure(records.length > 0, `${sourceLabel}: record-feed records are required.`);
            ensure(fileExists(sourcePath), `${sourceLabel}: record-feed source "${sourcePath}" does not exist.`);

            if (sourcePath && fileExists(sourcePath)) {
                const recordMap = loadRecordCollection(sourcePath);
                records.forEach((recordId) => {
                    ensure(
                        recordMap.has(recordId),
                        `${sourceLabel}: record "${recordId}" is missing from "${sourcePath}".`
                    );
                });
            }
            break;
        }
        default:
            errors.push(`${sourceLabel}: unsupported block type "${block?.type}".`);
    }
};

const manifest = readJson(manifestRelativePath);

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
}

if (errors.length) {
    console.error("Content validation failed:\n");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
}

console.log("Content validation passed.");
