document.addEventListener("DOMContentLoaded", async () => {
    const root = document.documentElement;
    const body = document.body;
    const siteHeader = document.querySelector(".site-header");
    const headerNav = document.querySelector(".header-nav");
    const menuToggle = document.getElementById("menu-toggle");
    const sidebar = document.getElementById("sidebar");
    const sidebarMenusRoot = document.getElementById("sidebar-menus");
    const sidebarBackdrop = document.getElementById("sidebar-backdrop");
    const sidebarClose = document.getElementById("sidebar-close");
    const logoLink = document.getElementById("logo-link");
    const siteName = document.querySelector(".site-name");
    const searchInput = document.getElementById("site-search");
    const searchStatus = document.getElementById("search-status");
    const searchEmpty = document.getElementById("search-empty");
    const searchResults = document.getElementById("search-results");
    const searchResultsList = document.getElementById("search-results-list");
    const searchResultsSummary = document.getElementById("search-results-summary");
    const contentSourceBanner = document.getElementById("content-source-banner");
    const contentSectionsRoot = document.getElementById("content-sections");
    const repoLink = document.querySelector(".repo-link");
    const descriptionMeta = document.querySelector('meta[name="description"]');
    const ogTitleMeta = document.querySelector('meta[property="og:title"]');
    const ogDescriptionMeta = document.querySelector('meta[property="og:description"]');
    const twitterTitleMeta = document.querySelector('meta[name="twitter:title"]');
    const twitterDescriptionMeta = document.querySelector('meta[name="twitter:description"]');
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const debugContentSource =
        new URLSearchParams(window.location.search).get("debugContentSource") === "1";

    let currentMenu = "home";
    let searchMode = false;
    let lastFocusedElement = null;
    let baseMetadata = {
        siteName: "LikeAnOpenSource",
        title: document.title,
        description: descriptionMeta?.getAttribute("content") || ""
    };

    const escapeHtml = (value = "") =>
        String(value).replace(/[&<>"']/g, (character) => {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            };
            return entities[character] || character;
        });

    const normalizeText = (value = "") =>
        value
            .toLocaleLowerCase("en")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ")
            .trim();

    const getPlainText = (value = "") =>
        String(value).replace(/\s+/g, " ").trim();

    const renderInlineMarkdown = (value = "") => {
        const placeholders = [];
        const protect = (markup) => {
            const token = `__LAOS_TOKEN_${placeholders.length}__`;
            placeholders.push(markup);
            return token;
        };

        let rendered = escapeHtml(value);
        rendered = rendered.replace(/`([^`]+)`/g, (_match, code) =>
            protect(`<code class="inline-code">${code}</code>`)
        );
        rendered = rendered.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
        rendered = rendered.replace(/\*([^*]+)\*/g, "<em>$1</em>");

        placeholders.forEach((markup, index) => {
            rendered = rendered.replace(`__LAOS_TOKEN_${index}__`, markup);
        });

        return rendered;
    };

    const renderMarkdownBody = (markdown, { skipTitle = false } = {}) => {
        const lines = String(markdown || "").replace(/\r\n?/g, "\n").split("\n");
        const markup = [];
        const paragraphBuffer = [];
        let listBuffer = null;
        let skippedFirstTitle = false;

        const flushParagraph = () => {
            if (!paragraphBuffer.length) {
                return;
            }

            markup.push(
                `<p class="doc-text">${renderInlineMarkdown(paragraphBuffer.join(" "))}</p>`
            );
            paragraphBuffer.length = 0;
        };

        const flushList = () => {
            if (!listBuffer?.items.length) {
                listBuffer = null;
                return;
            }

            markup.push(
                `<${listBuffer.type} class="doc-list markdown-list">${listBuffer.items
                    .map((item) => `<li>${item}</li>`)
                    .join("")}</${listBuffer.type}>`
            );
            listBuffer = null;
        };

        lines.forEach((rawLine) => {
            const line = rawLine.trim();

            if (!line) {
                flushParagraph();
                flushList();
                return;
            }

            const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
            if (headingMatch) {
                flushParagraph();
                flushList();

                const level = headingMatch[1].length;
                const headingText = headingMatch[2].trim();

                if (skipTitle && !skippedFirstTitle && level === 1) {
                    skippedFirstTitle = true;
                    return;
                }

                skippedFirstTitle = true;
                const headingClass = level <= 2 ? "doc-subtitle markdown-heading" : "markdown-subheading";
                const tagName = level <= 2 ? "h3" : "h4";
                markup.push(
                    `<${tagName} class="${headingClass}">${renderInlineMarkdown(headingText)}</${tagName}>`
                );
                return;
            }

            const unorderedMatch = line.match(/^[-*]\s+(.*)$/);
            if (unorderedMatch) {
                flushParagraph();
                if (!listBuffer || listBuffer.type !== "ul") {
                    flushList();
                    listBuffer = { type: "ul", items: [] };
                }
                listBuffer.items.push(renderInlineMarkdown(unorderedMatch[1]));
                return;
            }

            const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
            if (orderedMatch) {
                flushParagraph();
                if (!listBuffer || listBuffer.type !== "ol") {
                    flushList();
                    listBuffer = { type: "ol", items: [] };
                }
                listBuffer.items.push(renderInlineMarkdown(orderedMatch[1]));
                return;
            }

            if (listBuffer) {
                flushList();
            }

            paragraphBuffer.push(line);
        });

        flushParagraph();
        flushList();

        return markup.join("");
    };

    const getNavLinks = () =>
        Array.from(document.querySelectorAll(".header-nav a[data-menu]"));

    const getSidebarMenus = () =>
        Array.from(sidebarMenusRoot.querySelectorAll(".sidebar-menu"));

    const getSidebarLinks = () =>
        Array.from(sidebarMenusRoot.querySelectorAll(".sidebar-list a"));

    const getContentSections = () =>
        Array.from(contentSectionsRoot.querySelectorAll(".content-section"));

    const getDocumentGroups = () =>
        Array.from(contentSectionsRoot.querySelectorAll(".doc-section"));

    const getSectionByMenu = (menuId) =>
        document.getElementById(`content-${menuId}`);

    const getUrlWithState = ({ hash = window.location.hash, query = null } = {}) => {
        const url = new URL(window.location.href);
        if (query === null) {
            // Preserve current search params.
        } else if (query.trim()) {
            url.searchParams.set("q", query.trim());
        } else {
            url.searchParams.delete("q");
        }

        url.hash = hash || "";
        return `${url.pathname}${url.search}${url.hash}`;
    };

    const buildLinkAttributes = (card) => {
        if (!card.href) {
            return "";
        }

        const target = card.external ? ' target="_blank" rel="noopener noreferrer"' : "";
        return ` href="${escapeHtml(card.href)}"${target}`;
    };

    const renderCard = (card) => {
        const tagMarkup = card.tag
            ? `<span class="card-tag">${escapeHtml(card.tag)}</span>`
            : "";
        const descriptionMarkup = card.description
            ? `<p class="card-desc">${escapeHtml(card.description)}</p>`
            : "";
        const detailsMarkup = Array.isArray(card.details) && card.details.length
            ? `
                <ul class="card-meta">
                    ${card.details
                        .map(
                            (item) =>
                                `<li><span class="card-meta-label">${escapeHtml(item.label)}:</span> ${escapeHtml(item.text)}</li>`
                        )
                        .join("")}
                </ul>
            `
            : "";
        const linkMarkup =
            card.href && card.linkLabel
                ? `<a class="card-link"${buildLinkAttributes(card)}>${escapeHtml(card.linkLabel)}</a>`
                : "";

        return `
            <article class="card">
                ${tagMarkup}
                <h3 class="card-title">${escapeHtml(card.title)}</h3>
                ${descriptionMarkup}
                ${detailsMarkup}
                ${linkMarkup}
            </article>
        `;
    };

    const renderRecordSection = async (record, { contentSourceId = "local" } = {}) => {
        const tagMarkup = record.tag
            ? `<span class="card-tag">${escapeHtml(record.tag)}</span>`
            : "";
        const descriptionMarkup = record.description
            ? `<p class="record-detail-summary">${escapeHtml(record.description)}</p>`
            : "";
        const detailsMarkup = Array.isArray(record.details) && record.details.length
            ? `
                <ul class="card-meta record-detail-meta">
                    ${record.details
                        .map(
                            (item) =>
                                `<li><span class="card-meta-label">${escapeHtml(item.label)}:</span> ${escapeHtml(item.text)}</li>`
                        )
                        .join("")}
                </ul>
            `
            : "";

        let markdownMarkup = "";
        if (record.bodyPath && window.LAOSContentService?.loadTextContent) {
            try {
                const markdown = await window.LAOSContentService.loadTextContent(
                    record.bodyPath,
                    contentSourceId
                );
                markdownMarkup = `
                    <div class="record-detail-body markdown-block">
                        ${renderMarkdownBody(markdown, { skipTitle: true })}
                    </div>
                `;
            } catch (error) {
                console.warn("[LAOS record markdown]", error);
                markdownMarkup = `
                    <div class="callout warning">
                        <p>The article body could not be loaded right now.</p>
                    </div>
                `;
            }
        }

        const detailLinkSource =
            record.resourceHref && record.resourceLinkLabel
                ? {
                    href: record.resourceHref,
                    external: record.resourceExternal,
                    label: record.resourceLinkLabel
                }
                : record.external && record.href && record.linkLabel
                    ? {
                        href: record.href,
                        external: record.external,
                        label: record.linkLabel
                    }
                    : null;
        const linkMarkup = detailLinkSource
            ? `<a class="card-link record-detail-link"${buildLinkAttributes(detailLinkSource)}>${escapeHtml(detailLinkSource.label)}</a>`
            : "";

        return `
            <article id="record-${escapeHtml(record.id)}" class="record-detail">
                <div class="record-detail-head">
                    ${tagMarkup}
                    <h3 class="record-detail-title">${escapeHtml(record.title)}</h3>
                </div>
                ${descriptionMarkup}
                ${detailsMarkup}
                ${linkMarkup}
                ${markdownMarkup}
            </article>
        `;
    };

    const renderListItem = (item) => {
        if (item.label) {
            return `<li><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.text)}</li>`;
        }
        return `<li>${escapeHtml(item.text)}</li>`;
    };

    const renderBlock = async (block, { contentSourceId = "local" } = {}) => {
        switch (block.type) {
            case "paragraphs":
                return block.items
                    .map((item) => `<p class="doc-text">${escapeHtml(item)}</p>`)
                    .join("");
            case "list":
                return `
                    <ul class="doc-list">
                        ${block.items.map(renderListItem).join("")}
                    </ul>
                `;
            case "cards":
                return `
                    <div class="card-grid">
                        ${block.items.map(renderCard).join("")}
                    </div>
                `;
            case "record-sections":
                return `
                    <div class="record-stack">
                        ${(
                            await Promise.all(
                                block.items.map((item) =>
                                    renderRecordSection(item, { contentSourceId })
                                )
                            )
                        ).join("")}
                    </div>
                `;
            case "tags":
                return `
                    <div class="tag-list">
                        ${block.items
                            .map((item) => `<span class="tag-chip">${escapeHtml(item)}</span>`)
                            .join("")}
                    </div>
                `;
            case "callout":
                return `
                    <div class="callout${block.tone === "warning" ? " warning" : ""}">
                        <p>${escapeHtml(block.text)}</p>
                    </div>
                `;
            case "markdown": {
                if (!window.LAOSContentService?.loadTextContent) {
                    return `
                        <div class="callout warning">
                            <p>The Markdown renderer is unavailable, so this guide body could not be displayed.</p>
                        </div>
                    `;
                }

                try {
                    const markdown = await window.LAOSContentService.loadTextContent(
                        block.path,
                        contentSourceId
                    );

                    return `
                        <div class="markdown-block">
                            ${renderMarkdownBody(markdown, {
                                skipTitle: block.skipTitle !== false
                            })}
                        </div>
                    `;
                } catch (error) {
                    console.warn("[LAOS markdown]", error);
                    return `
                        <div class="callout warning">
                            <p>The guide body could not be loaded right now.</p>
                        </div>
                    `;
                }
            }
            default:
                return "";
        }
    };

    const renderGroup = async (group, options = {}) => {
        const introMarkup = group.intro
            .map((item) => `<p class="doc-text">${escapeHtml(item)}</p>`)
            .join("");
        const blockMarkup = (
            await Promise.all(group.blocks.map((block) => renderBlock(block, options)))
        ).join("");

        return `
            <div id="${escapeHtml(group.id)}" class="doc-section">
                <h2 class="doc-subtitle">${escapeHtml(group.title)}</h2>
                ${introMarkup}
                ${blockMarkup}
            </div>
        `;
    };

    const renderSection = async (menuId, section, isActive, options = {}) => {
        const subtitleMarkup = section.subtitle
            ? `<p class="doc-subtitle">${escapeHtml(section.subtitle)}</p>`
            : "";
        const introMarkup = section.intro
            .map((item) => `<p class="doc-text">${escapeHtml(item)}</p>`)
            .join("");
        const groupMarkup = (
            await Promise.all(section.groups.map((group) => renderGroup(group, options)))
        ).join("");
        const calloutMarkup = section.callout
            ? `
                <div class="callout${section.callout.tone === "warning" ? " warning" : ""}">
                    <p>${escapeHtml(section.callout.text)}</p>
                </div>
            `
            : "";

        return `
            <section
                id="content-${escapeHtml(menuId)}"
                class="content-section${isActive ? " active" : ""}"
                data-title="${escapeHtml(section.title)}"
                tabindex="-1"
                ${isActive ? "" : "hidden"}
            >
                <h1 class="doc-title">${escapeHtml(section.title)}</h1>
                ${subtitleMarkup}
                ${introMarkup}
                ${calloutMarkup}
                ${groupMarkup}
            </section>
        `;
    };

    const renderSidebarMenu = (menuId, section, isActive) => `
        <div class="sidebar-menu${isActive ? " active" : ""}" id="menu-${escapeHtml(menuId)}" data-menu="${escapeHtml(menuId)}">
            <h2 class="sidebar-title">${escapeHtml(section.title)}</h2>
            <ul class="sidebar-list">
                ${section.groups
                    .map(
                        (group) => `
                            <li>
                                <a href="#${escapeHtml(group.id)}">${escapeHtml(group.title)}</a>
                            </li>
                        `
                    )
                    .join("")}
            </ul>
        </div>
    `;

    const renderManifest = async (manifest, options = {}) => {
        const menuOrder = ["home", "explore", "projects", "articles", "guides", "about"];

        sidebarMenusRoot.innerHTML = menuOrder
            .map((menuId) => renderSidebarMenu(menuId, manifest.sections[menuId], menuId === "home"))
            .join("");

        contentSectionsRoot.innerHTML = (
            await Promise.all(
                menuOrder.map((menuId) =>
                    renderSection(menuId, manifest.sections[menuId], menuId === "home", options)
                )
            )
        ).join("");
    };

    const setContentSourceBanner = (loadResult) => {
        if (!contentSourceBanner || !loadResult?.message) {
            return;
        }

        if (!debugContentSource) {
            contentSourceBanner.hidden = true;
            contentSourceBanner.textContent = "";

            if (loadResult.state === "warning" || loadResult.state === "static") {
                console.warn("[LAOS content]", loadResult.message, loadResult.warnings || []);
            } else {
                console.info("[LAOS content]", loadResult.message);
            }
            return;
        }

        const warningMarkup =
            Array.isArray(loadResult.warnings) && loadResult.warnings.length
                ? `<span class="data-source-detail">${escapeHtml(loadResult.warnings[0])}</span>`
                : "";

        const sourceLinkMarkup =
            loadResult.source?.url
                ? `<a class="data-source-link" href="${escapeHtml(loadResult.source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(loadResult.source.label)}</a>`
                : "";

        contentSourceBanner.hidden = false;
        contentSourceBanner.dataset.state = loadResult.state || "info";
        contentSourceBanner.innerHTML = `
            <strong>${escapeHtml(loadResult.source?.label || "Content source")}</strong>
            <span>${escapeHtml(loadResult.message)}</span>
            ${sourceLinkMarkup}
            ${warningMarkup}
        `;
    };

    const applySiteMetadata = (manifest) => {
        if (manifest?.site?.name && siteName) {
            siteName.textContent = manifest.site.name;
        }

        if (manifest?.site?.name) {
            baseMetadata = {
                siteName: manifest.site.name,
                title: `${manifest.site.name} - Documentation and Discovery Platform`,
                description:
                    descriptionMeta?.getAttribute("content") ||
                    `${manifest.site.name} helps people explore open-source projects with clearer entry points, stronger technical context, and better contribution paths.`
            };
            document.title = baseMetadata.title;
        }

        if (manifest?.site?.repositoryUrl && repoLink) {
            repoLink.href = manifest.site.repositoryUrl;
        }
    };

    const updatePageMetadata = ({
        title = baseMetadata.title,
        description = baseMetadata.description
    } = {}) => {
        document.title = title;
        descriptionMeta?.setAttribute("content", description);
        ogTitleMeta?.setAttribute("content", title.replace(/\s+-\s+Documentation and Discovery Platform$/, ""));
        ogDescriptionMeta?.setAttribute("content", description);
        twitterTitleMeta?.setAttribute("content", title.replace(/\s+-\s+Documentation and Discovery Platform$/, ""));
        twitterDescriptionMeta?.setAttribute("content", description);
    };

    const getSectionDescription = (section) => {
        const subtitle = getPlainText(section.querySelector(":scope > .doc-subtitle")?.textContent || "");
        const introParagraph = getPlainText(section.querySelector(":scope > .doc-text")?.textContent || "");
        return subtitle || introParagraph || baseMetadata.description;
    };

    const setLocationHash = (hash, { replace = false } = {}) => {
        const nextUrl = getUrlWithState({ hash, query: "" });
        const currentUrl = getUrlWithState({ query: "" });
        if (!hash || currentUrl === nextUrl) {
            return;
        }

        try {
            if (replace) {
                window.history.replaceState(null, "", nextUrl);
            } else {
                window.history.pushState(null, "", nextUrl);
            }
        } catch {
            window.location.hash = hash;
        }
    };

    const syncSearchQueryParam = (query = "", { clearHash = false } = {}) => {
        const nextUrl = getUrlWithState({
            hash: clearHash ? "" : window.location.hash,
            query
        });
        const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

        if (nextUrl === currentUrl) {
            return;
        }

        try {
            window.history.replaceState(null, "", nextUrl);
        } catch {
            // Ignore replaceState failures in restricted environments.
        }
    };

    const updateHeaderOffset = () => {
        const headerOffset = siteHeader.offsetHeight + 16;
        root.style.setProperty("--header-offset", `${headerOffset}px`);
    };

    const updateStatus = (message) => {
        searchStatus.textContent = message;
    };

    const clearSidebarActiveLinks = () => {
        getSidebarLinks().forEach((link) => link.classList.remove("active"));
    };

    const getSidebarFocusableElements = () =>
        Array.from(
            sidebar.querySelectorAll(
                'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
        ).filter((element) => !element.hidden && element.getClientRects().length > 0);

    const setActiveNav = (menuId) => {
        getNavLinks().forEach((link) => {
            const isActive = link.dataset.menu === menuId;
            link.classList.toggle("active", isActive);
            if (isActive) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }
        });
    };

    const setActiveSidebarMenus = (menuIds) => {
        getSidebarMenus().forEach((menu) => {
            const isActive = menuIds.includes(menu.dataset.menu);
            menu.hidden = false;
            menu.classList.toggle("active", isActive);
        });
    };

    const setActiveSidebarLink = (menuId, targetId = null) => {
        clearSidebarActiveLinks();
        const activeMenu = getSidebarMenus().find((menu) => menu.dataset.menu === menuId);
        if (!activeMenu) {
            return;
        }

        const links = Array.from(activeMenu.querySelectorAll("a"));
        const targetLink =
            (targetId &&
                links.find((link) => link.getAttribute("href") === `#${targetId}`)) ||
            links[0];

        if (targetLink) {
            targetLink.classList.add("active");
        }
    };

    const syncSidebar = () => {
        if (desktopQuery.matches) {
            sidebar.classList.add("open");
            sidebarBackdrop.hidden = true;
            sidebarBackdrop.classList.remove("visible");
            body.classList.remove("sidebar-open");
            menuToggle.setAttribute("aria-expanded", "false");
            sidebar.setAttribute("aria-hidden", "false");
            return;
        }

        sidebar.classList.remove("open");
        sidebarBackdrop.hidden = true;
        sidebarBackdrop.classList.remove("visible");
        body.classList.remove("sidebar-open");
        menuToggle.setAttribute("aria-expanded", "false");
        sidebar.setAttribute("aria-hidden", "true");
    };

    const openSidebar = () => {
        if (desktopQuery.matches) {
            return;
        }

        lastFocusedElement =
            document.activeElement instanceof HTMLElement ? document.activeElement : menuToggle;
        sidebar.classList.add("open");
        body.classList.add("sidebar-open");
        menuToggle.setAttribute("aria-expanded", "true");
        sidebar.setAttribute("aria-hidden", "false");
        sidebarBackdrop.hidden = false;
        requestAnimationFrame(() => {
            sidebarBackdrop.classList.add("visible");
            const [firstFocusable] = getSidebarFocusableElements();
            firstFocusable?.focus();
        });
    };

    const closeSidebar = () => {
        if (desktopQuery.matches) {
            body.classList.remove("sidebar-open");
            sidebar.classList.add("open");
            sidebarBackdrop.hidden = true;
            sidebarBackdrop.classList.remove("visible");
            menuToggle.setAttribute("aria-expanded", "false");
            sidebar.setAttribute("aria-hidden", "false");
            return;
        }

        sidebar.classList.remove("open");
        body.classList.remove("sidebar-open");
        menuToggle.setAttribute("aria-expanded", "false");
        sidebar.setAttribute("aria-hidden", "true");
        sidebarBackdrop.classList.remove("visible");

        window.setTimeout(() => {
            if (!body.classList.contains("sidebar-open")) {
                sidebarBackdrop.hidden = true;
            }
        }, 220);

        const focusTarget =
            lastFocusedElement instanceof HTMLElement && lastFocusedElement.isConnected
                ? lastFocusedElement
                : menuToggle;
        window.setTimeout(() => {
            focusTarget.focus();
        }, 0);
    };

    const clearSearchState = () => {
        searchMode = false;
        searchInput.value = "";
        searchEmpty.hidden = true;
        searchResults.hidden = true;
        searchResultsList.innerHTML = "";
        searchResultsSummary.textContent = "";

        getDocumentGroups().forEach((group) => {
            group.hidden = false;
        });

        getSidebarMenus().forEach((menu) => {
            menu.hidden = false;
            menu.querySelectorAll("li").forEach((item) => {
                item.hidden = false;
            });
        });
    };

    const buildSearchSnippet = (text, query) => {
        const cleanText = getPlainText(text);
        if (!cleanText) {
            return "";
        }

        const loweredText = cleanText.toLocaleLowerCase("en");
        const loweredQuery = getPlainText(query).toLocaleLowerCase("en");
        const matchIndex = loweredText.indexOf(loweredQuery);

        if (matchIndex === -1) {
            return cleanText.length > 170 ? `${cleanText.slice(0, 167).trim()}...` : cleanText;
        }

        const start = Math.max(0, matchIndex - 56);
        const end = Math.min(cleanText.length, matchIndex + loweredQuery.length + 96);
        const prefix = start > 0 ? "..." : "";
        const suffix = end < cleanText.length ? "..." : "";
        return `${prefix}${cleanText.slice(start, end).trim()}${suffix}`;
    };

    const collectSearchMatches = (query) => {
        const normalizedQuery = normalizeText(query);
        const matches = [];
        const visibleGroups = new Set();
        const visibleMenus = new Set();
        const visibleSections = new Set();

        getDocumentGroups().forEach((group) => {
            const section = group.closest(".content-section");
            if (!section) {
                return;
            }

            const sectionTitle = section.dataset.title || "";
            const groupTitle = group.querySelector(".doc-subtitle")?.textContent || "";
            const bodyText = getPlainText(group.textContent);
            const searchableText = normalizeText(`${sectionTitle} ${groupTitle} ${bodyText}`);

            if (!searchableText.includes(normalizedQuery)) {
                return;
            }

            let score = 1;
            if (normalizeText(groupTitle).includes(normalizedQuery)) {
                score += 6;
            }
            if (normalizeText(sectionTitle).includes(normalizedQuery)) {
                score += 3;
            }
            if (normalizeText(bodyText.slice(0, 220)).includes(normalizedQuery)) {
                score += 2;
            }

            const menuId = section.id.replace("content-", "");
            visibleGroups.add(group.id);
            visibleMenus.add(menuId);
            visibleSections.add(section.id);

            matches.push({
                id: group.id,
                menuId,
                sectionId: section.id,
                sectionTitle,
                groupTitle,
                snippet: buildSearchSnippet(bodyText, query),
                score
            });
        });

        matches.sort((left, right) => {
            if (right.score !== left.score) {
                return right.score - left.score;
            }

            if (left.sectionTitle !== right.sectionTitle) {
                return left.sectionTitle.localeCompare(right.sectionTitle);
            }

            return left.groupTitle.localeCompare(right.groupTitle);
        });

        return {
            matches,
            visibleGroups,
            visibleMenus,
            visibleSections
        };
    };

    const renderSearchResults = (matches, query) => {
        if (!matches.length) {
            searchResults.hidden = true;
            searchResultsList.innerHTML = "";
            searchResultsSummary.textContent = "";
            return;
        }

        const limitedMatches = matches.slice(0, 8);
        searchResults.hidden = false;
        searchResultsSummary.textContent = `${matches.length} result(s) for "${query.trim()}"`;
        searchResultsList.innerHTML = limitedMatches
            .map(
                (match) => `
                    <a class="search-result-card" href="#${escapeHtml(match.id)}">
                        <span class="search-result-kicker">${escapeHtml(match.sectionTitle)}</span>
                        <h3 class="search-result-title">${escapeHtml(match.groupTitle)}</h3>
                        <p class="search-result-text">${escapeHtml(match.snippet)}</p>
                    </a>
                `
            )
            .join("");
    };

    const showSection = (
        menuId,
        {
            targetId = null,
            updateLocation = true,
            smooth = true,
            focus = true
        } = {}
    ) => {
        const section = getSectionByMenu(menuId);
        if (!section) {
            return;
        }

        currentMenu = menuId;
        clearSearchState();

        getContentSections().forEach((item) => {
            const isActive = item === section;
            item.hidden = !isActive;
            item.classList.toggle("active", isActive);
        });

        setActiveNav(menuId);
        setActiveSidebarMenus([menuId]);
        setActiveSidebarLink(menuId, targetId);
        updateStatus(`${section.dataset.title} section is currently displayed.`);
        updatePageMetadata({
            title: `${section.dataset.title} - ${baseMetadata.siteName}`,
            description: getSectionDescription(section)
        });

        if (updateLocation) {
            setLocationHash(targetId ? `#${targetId}` : `#${section.id}`);
        }

        if (focus) {
            section.focus({ preventScroll: true });
        }

        if (targetId) {
            const target = document.getElementById(targetId);
            if (target) {
                if (!target.hasAttribute("tabindex")) {
                    target.setAttribute("tabindex", "-1");
                }
                requestAnimationFrame(() => {
                    target.scrollIntoView({
                        behavior: smooth ? "smooth" : "auto",
                        block: "start"
                    });
                    target.focus({ preventScroll: true });
                });
            }
        } else {
            window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
        }

        closeSidebar();
    };

    const resolveHashTarget = (hash) => {
        if (!hash || hash === "#") {
            return null;
        }
        return document.getElementById(hash.slice(1));
    };

    const openFromHash = (hash, { updateLocation = false, smooth = false } = {}) => {
        const target = resolveHashTarget(hash);
        if (!target) {
            showSection("home", {
                updateLocation: false,
                smooth: false,
                focus: false
            });
            return;
        }

        const section = target.classList.contains("content-section")
            ? target
            : target.closest(".content-section");

        if (!section) {
            return;
        }

        const menuId = section.id.replace("content-", "");
        const targetId = target.id === section.id ? null : target.id;

        showSection(menuId, {
            targetId,
            updateLocation,
            smooth,
            focus: false
        });
    };

    const restoreCurrentSection = () => {
        syncSearchQueryParam("", { clearHash: false });
        showSection(currentMenu, {
            updateLocation: false,
            smooth: false,
            focus: false
        });
    };

    const applySearch = (query) => {
        const normalizedQuery = normalizeText(query);

        if (!normalizedQuery) {
            restoreCurrentSection();
            return;
        }

        searchMode = true;
        clearSidebarActiveLinks();
        setActiveNav("");
        syncSearchQueryParam(query, { clearHash: true });
        const searchState = collectSearchMatches(query);

        getContentSections().forEach((section) => {
            const isMatch = searchState.visibleSections.has(section.id);
            section.hidden = !isMatch;
            section.classList.toggle("active", isMatch);
        });

        getDocumentGroups().forEach((group) => {
            group.hidden = !searchState.visibleGroups.has(group.id);
        });

        getSidebarMenus().forEach((menu) => {
            let visibleItems = 0;
            const isVisibleMenu = searchState.visibleMenus.has(menu.dataset.menu);

            menu.querySelectorAll("li").forEach((item) => {
                const link = item.querySelector("a");
                const href = link?.getAttribute("href") || "";
                const targetId = href.startsWith("#") ? href.slice(1) : "";
                const isVisible = searchState.visibleGroups.has(targetId);
                item.hidden = !isVisible;
                if (isVisible) {
                    visibleItems += 1;
                }
            });

            menu.hidden = !isVisibleMenu || visibleItems === 0;
            menu.classList.toggle("active", isVisibleMenu && visibleItems > 0);
        });

        renderSearchResults(searchState.matches, query);
        searchEmpty.hidden = searchState.matches.length !== 0;
        updatePageMetadata({
            title: `Search - ${baseMetadata.siteName}`,
            description: `Search results for "${query.trim()}" on ${baseMetadata.siteName}.`
        });
        updateStatus(
            searchState.matches.length
                ? `${searchState.matches.length} result(s) found for "${query.trim()}".`
                : `No results found for "${query.trim()}".`
        );

        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleHashLinkClick = (event) => {
        const link = event.target.closest('a[href^="#"]');
        if (!link || link.classList.contains("skip-link") || link.closest(".header-nav")) {
            return;
        }

        const href = link.getAttribute("href");
        if (!href) {
            return;
        }

        event.preventDefault();
        openFromHash(href, { updateLocation: true, smooth: true });
    };

    const loadResult = window.LAOSContentService?.loadSiteContent
        ? await window.LAOSContentService.loadSiteContent()
        : {
            kind: "static",
            state: "warning",
            source: {
                id: "static",
                label: "Embedded fallback",
                url: ""
            },
            message: "The content service could not be loaded, so the page is using the embedded fallback view."
        };

    if (loadResult.kind === "manifest" && loadResult.manifest) {
        applySiteMetadata(loadResult.manifest);
        await renderManifest(loadResult.manifest, {
            contentSourceId: loadResult.source?.id || "local"
        });
    }

    setContentSourceBanner(loadResult);

    headerNav.addEventListener("click", (event) => {
        const link = event.target.closest("a[data-menu]");
        if (!link) {
            return;
        }

        event.preventDefault();
        showSection(link.dataset.menu);
    });

    logoLink.addEventListener("click", (event) => {
        event.preventDefault();
        showSection("home");
    });

    sidebarMenusRoot.addEventListener("click", handleHashLinkClick);
    contentSectionsRoot.addEventListener("click", handleHashLinkClick);
    searchResults.addEventListener("click", handleHashLinkClick);

    menuToggle.addEventListener("click", () => {
        if (body.classList.contains("sidebar-open")) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    sidebarClose.addEventListener("click", closeSidebar);
    sidebarBackdrop.addEventListener("click", closeSidebar);

    searchInput.addEventListener("input", (event) => {
        applySearch(event.target.value);
    });

    searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && searchInput.value) {
            restoreCurrentSection();
            searchInput.blur();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && body.classList.contains("sidebar-open")) {
            closeSidebar();
        }
    });

    sidebar.addEventListener("keydown", (event) => {
        if (!body.classList.contains("sidebar-open") || event.key !== "Tab") {
            return;
        }

        const focusable = getSidebarFocusableElements();
        if (!focusable.length) {
            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });

    desktopQuery.addEventListener("change", () => {
        syncSidebar();
        updateHeaderOffset();
    });

    window.addEventListener("resize", updateHeaderOffset);
    window.addEventListener("hashchange", () => {
        if (!window.location.hash) {
            return;
        }
        openFromHash(window.location.hash, {
            updateLocation: false,
            smooth: false
        });
    });

    updateHeaderOffset();
    syncSidebar();

    if (window.location.hash) {
        openFromHash(window.location.hash, {
            updateLocation: false,
            smooth: false
        });
    } else if (new URLSearchParams(window.location.search).get("q")) {
        const query = new URLSearchParams(window.location.search).get("q") || "";
        searchInput.value = query;
        applySearch(query);
    } else {
        showSection("home", {
            updateLocation: false,
            smooth: false,
            focus: false
        });
    }
});
