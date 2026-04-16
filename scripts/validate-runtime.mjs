import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const rootDir = path.resolve(import.meta.dirname, "..");
const indexHtml = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
const embeddedManifestMatch = indexHtml.match(
    /<script id="embedded-manifest" type="application\/json">([\s\S]*?)<\/script>/
);

if (!embeddedManifestMatch) {
    throw new Error('index.html: missing embedded manifest block.');
}

const embeddedManifestText = embeddedManifestMatch[1].trim();

const readWorkspaceFile = (relativePath) =>
    fs.readFileSync(path.join(rootDir, relativePath), "utf8");

const createFetch = ({ allowLocal = true } = {}) => async (url) => {
    if (!allowLocal || typeof url !== "string") {
        return new Response("Unavailable", { status: 503 });
    }

    if (/^https?:\/\//i.test(url)) {
        return new Response("Unavailable", { status: 503 });
    }

    const relativePath = url.replace(/^\.\//, "").trim();
    const absolutePath = path.join(rootDir, relativePath);
    if (!fs.existsSync(absolutePath)) {
        return new Response("Not Found", { status: 404 });
    }

    const extension = path.extname(relativePath).toLowerCase();
    const contentType =
        extension === ".json"
            ? "application/json"
            : extension === ".md"
              ? "text/markdown"
              : "text/plain";

    return new Response(readWorkspaceFile(relativePath), {
        status: 200,
        headers: {
            "Content-Type": contentType
        }
    });
};

const createStorage = () => {
    const store = new Map();
    return {
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
            store.set(key, String(value));
        },
        removeItem(key) {
            store.delete(key);
        }
    };
};

const createContext = ({ allowLocal = true } = {}) => {
    const document = {
        getElementById(id) {
            if (id === "embedded-manifest") {
                return { textContent: embeddedManifestText };
            }

            return null;
        }
    };

    const window = {
        localStorage: createStorage(),
        location: {
            protocol: allowLocal ? "http:" : "https:"
        },
        document
    };

    const context = {
        window,
        document,
        console,
        fetch: createFetch({ allowLocal }),
        Response,
        Headers,
        Request,
        URL,
        URLSearchParams,
        setTimeout,
        clearTimeout
    };

    vm.createContext(context);
    vm.runInContext(readWorkspaceFile("content-config.js"), context, {
        filename: "content-config.js"
    });
    vm.runInContext(readWorkspaceFile("content-service.js"), context, {
        filename: "content-service.js"
    });

    return context.window.LAOSContentService;
};

const ensure = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};

const getSection = (manifest, menuId) => manifest?.sections?.[menuId];
const getGroup = (section, groupId) =>
    Array.isArray(section?.groups)
        ? section.groups.find((group) => group.id === groupId)
        : null;
const getBlock = (group, type) =>
    Array.isArray(group?.blocks) ? group.blocks.find((block) => block.type === type) : null;

const localService = createContext({ allowLocal: true });
const localResult = await localService.loadSiteContent();

ensure(localResult.kind === "manifest", "Runtime validation: expected a manifest result.");
ensure(localResult.source?.id === "local", "Runtime validation: local source should win in HTTP mode.");

const contributeSection = getSection(localResult.manifest, "contribute");
const openTopicsGroup = getGroup(contributeSection, "contribute-open-topics");
const openTopicsBlock = getBlock(openTopicsGroup, "cards");
const topicBriefsGroup = getGroup(contributeSection, "contribute-topic-briefs");
const topicBriefsBlock = getBlock(topicBriefsGroup, "record-sections");

ensure(contributeSection, 'Runtime validation: missing "contribute" section.');
ensure(openTopicsBlock, 'Runtime validation: missing "contribute-open-topics" cards.');
ensure(
    Array.isArray(openTopicsBlock.items) && openTopicsBlock.items.length > 0,
    "Runtime validation: contribute topic cards are empty."
);
ensure(topicBriefsBlock, 'Runtime validation: missing "contribute-topic-briefs" detail sections.');
ensure(
    Array.isArray(topicBriefsBlock.items) && topicBriefsBlock.items.length === openTopicsBlock.items.length,
    "Runtime validation: contribute topic detail sections do not match the card backlog."
);

const projectSection = getSection(localResult.manifest, "projects");
const articleSection = getSection(localResult.manifest, "articles");
ensure(getGroup(projectSection, "projects-status"), 'Runtime validation: missing "projects-status" group.');
ensure(
    getGroup(projectSection, "projects-published-notes"),
    'Runtime validation: missing "projects-published-notes" group.'
);
ensure(getGroup(projectSection, "projects-open-call"), 'Runtime validation: missing "projects-open-call" group.');
ensure(!getGroup(projectSection, "projects-reading-room"), 'Runtime validation: old project seed group still exists.');
ensure(getGroup(articleSection, "articles-status"), 'Runtime validation: missing "articles-status" group.');
ensure(
    getGroup(articleSection, "articles-published-library"),
    'Runtime validation: missing "articles-published-library" group.'
);
ensure(getGroup(articleSection, "articles-open-call"), 'Runtime validation: missing "articles-open-call" group.');
ensure(!getGroup(articleSection, "articles-reading-room"), 'Runtime validation: old article seed group still exists.');

const topicMarkdown = await localService.loadTextContent(
    "content/topics/docs-platform-comparison-guide.md",
    "local"
);
ensure(
    topicMarkdown.toLowerCase().includes("# compare documentation platforms for small teams"),
    "Runtime validation: topic markdown could not be loaded from local content."
);

const embeddedOnlyService = createContext({ allowLocal: false });
const embeddedResult = await embeddedOnlyService.loadSiteContent();

ensure(
    embeddedResult.kind === "manifest" && embeddedResult.source?.id === "embedded",
    "Runtime validation: embedded manifest fallback did not activate when network content was unavailable."
);
ensure(
    getSection(embeddedResult.manifest, "home")?.title === "Home",
    "Runtime validation: embedded manifest did not restore the expected section content."
);
ensure(
    Array.isArray(
        getBlock(
            getGroup(getSection(embeddedResult.manifest, "contribute"), "contribute-open-topics"),
            "cards"
        )?.items
    ) &&
        getBlock(
            getGroup(getSection(embeddedResult.manifest, "contribute"), "contribute-open-topics"),
            "cards"
        ).items.length > 0,
    "Runtime validation: embedded fallback did not preserve the topic backlog."
);

console.log("Runtime validation passed.");
