window.LAOSContentService = (() => {
    const config = window.LAOS_CONTENT_CONFIG || {};
    const requiredMenus = ["home", "explore", "projects", "articles", "guides", "about"];
    const defaultTitles = {
        home: "Home",
        explore: "Explore",
        projects: "Projects",
        articles: "Articles",
        guides: "Guides",
        about: "About"
    };

    const toArray = (value) => {
        if (Array.isArray(value)) {
            return value.filter(Boolean);
        }
        if (typeof value === "string" && value.trim()) {
            return [value.trim()];
        }
        return [];
    };

    const normalizeCallout = (value) => {
        if (!value || typeof value !== "object") {
            return null;
        }

        const text = typeof value.text === "string" ? value.text.trim() : "";
        if (!text) {
            return null;
        }

        return {
            tone: value.tone === "warning" ? "warning" : "default",
            text
        };
    };

    const normalizeCardDetail = (item) => {
        if (!item || typeof item !== "object") {
            return null;
        }

        const label = typeof item.label === "string" ? item.label.trim() : "";
        const text = typeof item.text === "string" ? item.text.trim() : "";

        if (!label || !text) {
            return null;
        }

        return { label, text };
    };

    const normalizeCard = (item) => {
        if (!item || typeof item !== "object") {
            return null;
        }

        const title = typeof item.title === "string" ? item.title.trim() : "";
        if (!title) {
            return null;
        }

        return {
            tag: typeof item.tag === "string" ? item.tag.trim() : "",
            title,
            description: typeof item.description === "string" ? item.description.trim() : "",
            details: toArray(item.details)
                .map(normalizeCardDetail)
                .filter(Boolean),
            href: typeof item.href === "string" ? item.href.trim() : "",
            linkLabel: typeof item.linkLabel === "string" ? item.linkLabel.trim() : "",
            external: Boolean(item.external)
        };
    };

    const normalizeRecordFeed = (block) => {
        if (!block || typeof block !== "object") {
            return null;
        }

        const sourcePath = typeof block.sourcePath === "string" ? block.sourcePath.trim() : "";
        const records = toArray(block.records)
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter(Boolean);

        if (!sourcePath || !records.length) {
            return null;
        }

        return {
            type: "record-feed",
            sourcePath,
            records,
            layout: block.layout === "details" ? "details" : "cards"
        };
    };

    const normalizeListItem = (item) => {
        if (typeof item === "string") {
            const text = item.trim();
            return text ? { text, label: "" } : null;
        }

        if (!item || typeof item !== "object") {
            return null;
        }

        const text = typeof item.text === "string" ? item.text.trim() : "";
        const label = typeof item.label === "string" ? item.label.trim() : "";

        if (!text && !label) {
            return null;
        }

        return { text, label };
    };

    const normalizeBlock = (block) => {
        if (!block || typeof block !== "object") {
            return null;
        }

        switch (block.type) {
            case "paragraphs": {
                const items = toArray(block.items);
                return items.length ? { type: "paragraphs", items } : null;
            }
            case "list": {
                const items = toArray(block.items)
                    .map(normalizeListItem)
                    .filter(Boolean);
                return items.length ? { type: "list", items } : null;
            }
            case "cards": {
                const items = toArray(block.items)
                    .map(normalizeCard)
                    .filter(Boolean);
                return items.length ? { type: "cards", items } : null;
            }
            case "tags": {
                const items = toArray(block.items);
                return items.length ? { type: "tags", items } : null;
            }
            case "callout": {
                const callout = normalizeCallout(block);
                return callout ? { type: "callout", ...callout } : null;
            }
            case "markdown": {
                const path = typeof block.path === "string" ? block.path.trim() : "";
                if (!path) {
                    return null;
                }

                return {
                    type: "markdown",
                    path,
                    skipTitle: block.skipTitle !== false
                };
            }
            case "record-feed":
                return normalizeRecordFeed(block);
            default:
                return null;
        }
    };

    const normalizeGroup = (menuId, group, index) => {
        if (!group || typeof group !== "object") {
            return null;
        }

        const title = typeof group.title === "string" ? group.title.trim() : "";
        if (!title) {
            return null;
        }

        return {
            id:
                (typeof group.id === "string" && group.id.trim()) ||
                `${menuId}-group-${index + 1}`,
            title,
            intro: toArray(group.intro),
            blocks: toArray(group.blocks)
                .map(normalizeBlock)
                .filter(Boolean)
        };
    };

    const normalizeSection = (menuId, section) => {
        const safeSection = section && typeof section === "object" ? section : {};
        return {
            title:
                (typeof safeSection.title === "string" && safeSection.title.trim()) ||
                defaultTitles[menuId],
            subtitle:
                typeof safeSection.subtitle === "string" ? safeSection.subtitle.trim() : "",
            intro: toArray(safeSection.intro),
            callout: normalizeCallout(safeSection.callout),
            groups: toArray(safeSection.groups)
                .map((group, index) => normalizeGroup(menuId, group, index))
                .filter(Boolean)
        };
    };

    const normalizeManifest = (manifest) => {
        if (!manifest || typeof manifest !== "object") {
            throw new Error("The manifest is empty or invalid.");
        }

        const sections = {};
        requiredMenus.forEach((menuId) => {
            sections[menuId] = normalizeSection(menuId, manifest.sections?.[menuId]);
        });

        return {
            meta: {
                version: manifest.meta?.version || 1,
                generatedAt:
                    typeof manifest.meta?.generatedAt === "string"
                        ? manifest.meta.generatedAt
                        : "",
                repository: {
                    owner:
                        manifest.meta?.repository?.owner ||
                        config.repository?.owner ||
                        "",
                    name:
                        manifest.meta?.repository?.name ||
                        config.repository?.name ||
                        "",
                    branch:
                        manifest.meta?.repository?.branch ||
                        config.repository?.branch ||
                        ""
                }
            },
            site: {
                name:
                    typeof manifest.site?.name === "string"
                        ? manifest.site.name.trim()
                        : "LikeAnOpenSource",
                repositoryUrl:
                    typeof manifest.site?.repositoryUrl === "string"
                        ? manifest.site.repositoryUrl.trim()
                        : ""
            },
            sections
        };
    };

    const readCache = () => {
        if (!config.cacheKey) {
            return null;
        }

        try {
            const rawValue = window.localStorage.getItem(config.cacheKey);
            if (!rawValue) {
                return null;
            }

            const payload = JSON.parse(rawValue);
            if (
                !payload ||
                typeof payload !== "object" ||
                typeof payload.savedAt !== "number" ||
                !payload.manifest
            ) {
                return null;
            }

            const isFresh =
                Number.isFinite(config.cacheTtlMs) &&
                Date.now() - payload.savedAt <= config.cacheTtlMs;

            return {
                isFresh,
                manifest: normalizeManifest(payload.manifest)
            };
        } catch {
            return null;
        }
    };

    const writeCache = (manifest) => {
        if (!config.cacheKey) {
            return;
        }

        try {
            window.localStorage.setItem(
                config.cacheKey,
                JSON.stringify({
                    savedAt: Date.now(),
                    manifest
                })
            );
        } catch {
            // localStorage may be full or unavailable; continue silently.
        }
    };

    const normalizeRecordIndexEntry = (item) => {
        if (!item || typeof item !== "object") {
            return null;
        }

        const id = typeof item.id === "string" ? item.id.trim() : "";
        const path = typeof item.path === "string" ? item.path.trim() : "";

        if (!id || !path) {
            return null;
        }

        return { id, path };
    };

    const normalizeRecordEntry = (item, fallbackId = "") => {
        if (!item || typeof item !== "object") {
            return null;
        }

        const card = normalizeCard({
            tag: item.tag,
            title: item.title,
            description: item.description,
            details: item.details,
            href: item.href,
            linkLabel: item.linkLabel,
            external: item.external
        });

        if (!card) {
            return null;
        }

        return {
            id:
                (typeof item.id === "string" && item.id.trim()) ||
                fallbackId,
            ...card,
            bodyPath: typeof item.bodyPath === "string" ? item.bodyPath.trim() : ""
        };
    };

    const buildManifestSources = () => {
        const repository = config.repository || {};
        const manifestPath = (config.manifestPath || "").replace(/^\/+/, "");
        const githubRawBaseUrl =
            repository.owner && repository.name && repository.branch && manifestPath
                ? `https://raw.githubusercontent.com/${repository.owner}/${repository.name}/${repository.branch}/`
                : "";
        const githubRawUrl = githubRawBaseUrl ? `${githubRawBaseUrl}${manifestPath}` : "";

        return [
            {
                id: "local",
                label: "Local manifest",
                url: `./${manifestPath}`
            },
            githubRawUrl
                ? {
                    id: "github",
                    label: "GitHub Raw",
                    url: githubRawUrl
                }
                : null
        ].filter(Boolean);
    };

    const fetchManifest = async (source) => {
        const response = await fetch(source.url, {
            cache: "no-store",
            headers: {
                Accept: "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`${source.label} returned status ${response.status}.`);
        }

        return response.json();
    };

    const fetchTextContent = async (url) => {
        const response = await fetch(url, {
            cache: "no-store",
            headers: {
                Accept: "text/plain, text/markdown;q=0.9"
            }
        });

        if (!response.ok) {
            throw new Error(`Text content returned status ${response.status}.`);
        }

        return response.text();
    };

    const fetchJsonContent = async (url) => {
        const response = await fetch(url, {
            cache: "no-store",
            headers: {
                Accept: "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`JSON content returned status ${response.status}.`);
        }

        return response.json();
    };

    const buildContentSources = (contentPath, preferredSourceId = "local") => {
        const cleanPath = typeof contentPath === "string" ? contentPath.replace(/^\/+/, "").trim() : "";
        if (!cleanPath) {
            return [];
        }

        const repository = config.repository || {};
        const githubRawBaseUrl =
            repository.owner && repository.name && repository.branch
                ? `https://raw.githubusercontent.com/${repository.owner}/${repository.name}/${repository.branch}/`
                : "";

        const localSource = {
            id: "local",
            label: "Local content",
            url: `./${cleanPath}`
        };

        const githubSource = githubRawBaseUrl
            ? {
                id: "github",
                label: "GitHub Raw content",
                url: `${githubRawBaseUrl}${cleanPath}`
            }
            : null;

        switch (preferredSourceId) {
            case "github":
                return [githubSource, localSource].filter(Boolean);
            case "local":
                return [localSource, githubSource].filter(Boolean);
            default:
                return [localSource, githubSource].filter(Boolean);
        }
    };

    const loadTextContent = async (contentPath, preferredSourceId = "local") => {
        const sources = buildContentSources(contentPath, preferredSourceId);
        const errors = [];

        for (const source of sources) {
            try {
                return await fetchTextContent(source.url);
            } catch (error) {
                errors.push(error instanceof Error ? error.message : String(error));
            }
        }

        throw new Error(
            `The text content at "${contentPath}" could not be loaded.${errors.length ? ` ${errors[0]}` : ""}`
        );
    };

    const loadJsonContent = async (contentPath, preferredSourceId = "local") => {
        const sources = buildContentSources(contentPath, preferredSourceId);
        const errors = [];

        for (const source of sources) {
            try {
                return await fetchJsonContent(source.url);
            } catch (error) {
                errors.push(error instanceof Error ? error.message : String(error));
            }
        }

        throw new Error(
            `The JSON content at "${contentPath}" could not be loaded.${errors.length ? ` ${errors[0]}` : ""}`
        );
    };

    const loadRecordCollection = async (
        sourcePath,
        preferredSourceId = "local",
        collectionCache = new Map()
    ) => {
        const cacheKey = `${preferredSourceId}:${sourcePath}`;
        if (collectionCache.has(cacheKey)) {
            return collectionCache.get(cacheKey);
        }

        const rawIndex = await loadJsonContent(sourcePath, preferredSourceId);
        const recordRefs = toArray(rawIndex.records)
            .map(normalizeRecordIndexEntry)
            .filter(Boolean);

        const records = await Promise.all(
            recordRefs.map(async (recordRef) => {
                const rawRecord = await loadJsonContent(recordRef.path, preferredSourceId);
                return normalizeRecordEntry(rawRecord, recordRef.id);
            })
        );

        const recordMap = new Map(
            records.filter(Boolean).map((record) => [record.id, record])
        );

        collectionCache.set(cacheKey, recordMap);
        return recordMap;
    };

    const hydrateBlock = async (
        block,
        preferredSourceId = "local",
        collectionCache = new Map()
    ) => {
        if (!block || typeof block !== "object") {
            return null;
        }

        if (block.type !== "record-feed") {
            return block;
        }

        const recordMap = await loadRecordCollection(
            block.sourcePath,
            preferredSourceId,
            collectionCache
        );
        const items = block.records
            .map((recordId) => recordMap.get(recordId))
            .filter(Boolean);

        if (block.layout === "details") {
            return items.length
                ? {
                    type: "record-sections",
                    items
                }
                : null;
        }

        return items.length
            ? {
                type: "cards",
                items: items.map(({ id, bodyPath, ...card }) => card)
            }
            : null;
    };

    const hydrateManifest = async (manifest, preferredSourceId = "local") => {
        const collectionCache = new Map();
        const sections = {};

        for (const menuId of requiredMenus) {
            const section = manifest.sections?.[menuId];
            if (!section) {
                continue;
            }

            const groups = [];
            for (const group of section.groups || []) {
                const blocks = (
                    await Promise.all(
                        (group.blocks || []).map((block) =>
                            hydrateBlock(block, preferredSourceId, collectionCache)
                        )
                    )
                ).filter(Boolean);

                groups.push({
                    ...group,
                    blocks
                });
            }

            sections[menuId] = {
                ...section,
                groups
            };
        }

        return {
            ...manifest,
            sections
        };
    };

    const loadSiteContent = async () => {
        const sources = buildManifestSources();
        const errors = [];

        for (const source of sources) {
            try {
                const manifest = await fetchManifest(source);
                const normalized = normalizeManifest(manifest);
                const hydrated = await hydrateManifest(normalized, source.id);
                writeCache(hydrated);

                return {
                    kind: "manifest",
                    source,
                    manifest: hydrated,
                    state: source.id,
                    message:
                        source.id === "local"
                            ? "Content loaded from the local manifest."
                            : "Content loaded from the GitHub Raw source."
                };
            } catch (error) {
                errors.push(error instanceof Error ? error.message : String(error));
            }
        }

        const cached = readCache();
        if (cached?.manifest) {
            const hydrated = await hydrateManifest(cached.manifest, "local");
            return {
                kind: "manifest",
                source: {
                    id: "cache",
                    label: "Browser cache",
                    url: ""
                },
                manifest: hydrated,
                state: "cache",
                message: cached.isFresh
                    ? "Network access failed, so the latest cached manifest was used."
                    : "Network access failed, so an older but valid cached manifest was used.",
                warnings: errors
            };
        }

        return {
                kind: "static",
                source: {
                    id: "static",
                    label: "Embedded fallback",
                    url: ""
                },
                state: "warning",
                message:
                    window.location.protocol === "file:"
                    ? "The manifest could not be loaded, so the page is using the embedded fallback view. Open the project through an HTTP server to test the data layer."
                    : "The manifest could not be loaded, so the page is using the embedded fallback view.",
                warnings: errors
            };
    };

    return {
        loadSiteContent,
        loadTextContent
    };
})();
