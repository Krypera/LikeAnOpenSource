import fs from "node:fs";
import path from "node:path";

const readFile = (rootDir, relativePath) =>
    fs.readFileSync(path.join(rootDir, relativePath), "utf8");

const readJson = (rootDir, relativePath) =>
    JSON.parse(readFile(rootDir, relativePath));

const toArray = (value) => (Array.isArray(value) ? value : []);

const readRecordMap = (rootDir, sourcePath) => {
    const indexJson = readJson(rootDir, sourcePath);
    const recordMap = new Map();

    toArray(indexJson.records).forEach((entry) => {
        if (!entry || typeof entry !== "object") {
            return;
        }

        const id = typeof entry.id === "string" ? entry.id.trim() : "";
        const recordPath = typeof entry.path === "string" ? entry.path.trim() : "";
        if (!id || !recordPath) {
            return;
        }

        recordMap.set(id, readJson(rootDir, recordPath));
    });

    return recordMap;
};

const inlineRecord = (rootDir, record) => {
    if (!record || typeof record !== "object") {
        return null;
    }

    return {
        ...record,
        bodyMarkdown:
            typeof record.bodyPath === "string" && record.bodyPath.trim()
                ? readFile(rootDir, record.bodyPath.trim())
                : ""
    };
};

const inlineBlock = (rootDir, block) => {
    if (!block || typeof block !== "object") {
        return block;
    }

    switch (block.type) {
        case "markdown":
            return {
                type: "markdown-inline",
                content:
                    typeof block.path === "string" && block.path.trim()
                        ? readFile(rootDir, block.path.trim())
                        : "",
                skipTitle: block.skipTitle !== false
            };
        case "record-feed": {
            const recordMap = readRecordMap(rootDir, block.sourcePath);
            const selectedRecords = toArray(block.records).length
                ? toArray(block.records).map((recordId) => recordMap.get(recordId))
                : Array.from(recordMap.values());
            const items = selectedRecords
                .map((record) => inlineRecord(rootDir, record))
                .filter(Boolean);

            if (block.layout === "details") {
                return {
                    type: "record-sections",
                    items
                };
            }

            return {
                type: "cards",
                items: items.map(({ id, bodyPath, bodyMarkdown, ...card }) => card)
            };
        }
        default:
            return block;
    }
};

export const buildEmbeddedManifest = (rootDir) => {
    const manifest = readJson(rootDir, "content/site-content.v1.json");

    return {
        ...manifest,
        sections: Object.fromEntries(
            Object.entries(manifest.sections || {}).map(([menuId, section]) => [
                menuId,
                {
                    ...section,
                    groups: toArray(section?.groups).map((group) => ({
                        ...group,
                        blocks: toArray(group?.blocks).map((block) => inlineBlock(rootDir, block))
                    }))
                }
            ])
        )
    };
};
