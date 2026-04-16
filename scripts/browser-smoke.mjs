import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const rootDir = path.resolve(import.meta.dirname, "..");

const contentTypes = new Map([
    [".css", "text/css; charset=utf-8"],
    [".html", "text/html; charset=utf-8"],
    [".js", "application/javascript; charset=utf-8"],
    [".json", "application/json; charset=utf-8"],
    [".md", "text/markdown; charset=utf-8"],
    [".svg", "image/svg+xml"],
    [".txt", "text/plain; charset=utf-8"],
    [".webmanifest", "application/manifest+json; charset=utf-8"],
    [".xml", "application/xml; charset=utf-8"]
]);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureInsideRoot = (targetPath) => {
    const relativePath = path.relative(rootDir, targetPath);
    return relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
};

const resolveRequestPath = (requestUrl) => {
    const pathname = decodeURIComponent(new URL(requestUrl, "http://127.0.0.1").pathname);
    const normalizedPath = pathname === "/" ? "/index.html" : pathname;
    const absolutePath = path.normalize(path.join(rootDir, normalizedPath.replace(/^\/+/, "")));

    if (!ensureInsideRoot(absolutePath) && absolutePath !== path.join(rootDir, "index.html")) {
        return null;
    }

    if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isDirectory()) {
        const directoryIndex = path.join(absolutePath, "index.html");
        return fs.existsSync(directoryIndex) ? directoryIndex : null;
    }

    return fs.existsSync(absolutePath) ? absolutePath : null;
};

const startServer = async () => {
    const server = http.createServer((request, response) => {
        const absolutePath = resolveRequestPath(request.url || "/");
        if (!absolutePath) {
            response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Not Found");
            return;
        }

        const extension = path.extname(absolutePath).toLowerCase();
        const contentType = contentTypes.get(extension) || "application/octet-stream";

        response.writeHead(200, { "Content-Type": contentType });
        fs.createReadStream(absolutePath).pipe(response);
    });

    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });

    const address = server.address();
    if (!address || typeof address === "string") {
        throw new Error("Browser smoke server could not determine its listening address.");
    }

    return {
        server,
        origin: `http://127.0.0.1:${address.port}`
    };
};

const commandExists = (command) => {
    const result = spawnSync(command, ["--version"], {
        stdio: "ignore",
        shell: process.platform === "win32"
    });
    return result.status === 0;
};

const findBrowserBinary = () => {
    const explicitBrowser = process.env.BROWSER_BIN;
    if (explicitBrowser && fs.existsSync(explicitBrowser)) {
        return explicitBrowser;
    }

    const candidatesByPlatform = {
        win32: [
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
            "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
            "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
        ],
        darwin: [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
        ],
        linux: [
            "google-chrome",
            "google-chrome-stable",
            "chromium",
            "chromium-browser",
            "microsoft-edge"
        ]
    };

    const candidates = candidatesByPlatform[process.platform] || candidatesByPlatform.linux;

    for (const candidate of candidates) {
        if (path.isAbsolute(candidate)) {
            if (fs.existsSync(candidate)) {
                return candidate;
            }
            continue;
        }

        if (commandExists(candidate)) {
            return candidate;
        }
    }

    throw new Error(
        "No supported browser binary was found. Set BROWSER_BIN to a Chrome or Edge executable."
    );
};

const runBrowserDump = async (browserBinary, url) => {
    const launch = (headlessMode) =>
        new Promise((resolve, reject) => {
            const args = [
                headlessMode,
                "--disable-background-networking",
                "--disable-default-apps",
                "--disable-extensions",
                "--disable-gpu",
                "--hide-scrollbars",
                "--mute-audio",
                "--run-all-compositor-stages-before-draw",
                "--virtual-time-budget=20000",
                "--dump-dom",
                "--window-size=1600,1400",
                url
            ];

            if (process.platform === "linux") {
                args.unshift("--no-sandbox");
            }

            const child = spawn(browserBinary, args, {
                cwd: rootDir,
                stdio: ["ignore", "pipe", "pipe"],
                shell: false
            });

            let stdout = "";
            let stderr = "";

            child.stdout.on("data", (chunk) => {
                stdout += chunk.toString();
            });

            child.stderr.on("data", (chunk) => {
                stderr += chunk.toString();
            });

            child.on("error", reject);
            child.on("close", (code) => {
                if (code === 0) {
                    resolve(stdout);
                    return;
                }

                reject(
                    new Error(
                        `Browser process exited with code ${code}.${stderr ? ` ${stderr.trim()}` : ""}`
                    )
                );
            });
        });

    try {
        return await launch("--headless=new");
    } catch (error) {
        if (process.platform === "win32") {
            return launch("--headless");
        }
        throw error;
    }
};

const parseRunnerResult = (html, scenario) => {
    const statusMatch = html.match(/<body[^>]*data-status="([^"]+)"/i);
    const payloadMatch = html.match(
        /<script id="smoke-result" type="application\/json">([\s\S]*?)<\/script>/i
    );

    if (!statusMatch || !payloadMatch) {
        throw new Error(`Browser smoke (${scenario}) did not return a parseable result payload.`);
    }

    const payload = JSON.parse(payloadMatch[1].trim());
    if (statusMatch[1] !== "pass" || payload.status !== "pass") {
        const failureDetails = Array.isArray(payload.results)
            ? payload.results
                .filter((item) => item.status === "fail")
                .map((item) => item.message)
                .join("; ")
            : "";
        throw new Error(
            `Browser smoke (${scenario}) failed.${payload.error ? ` ${payload.error}` : ""}${
                failureDetails ? ` ${failureDetails}` : ""
            }`
        );
    }

    return payload;
};

const runScenario = async (browserBinary, origin, scenario) => {
    const scenarioUrl = `${origin}/tests/browser-smoke-runner.html?scenario=${encodeURIComponent(
        scenario
    )}&t=${Date.now()}`;

    const html = await runBrowserDump(browserBinary, scenarioUrl);
    return parseRunnerResult(html, scenario);
};

const main = async () => {
    const browserBinary = findBrowserBinary();
    const { server, origin } = await startServer();

    try {
        await wait(150);
        const desktopResult = await runScenario(browserBinary, origin, "desktop");
        const mobileResult = await runScenario(browserBinary, origin, "mobile");

        console.log(
            `Browser smoke passed. Scenarios: ${desktopResult.scenario}, ${mobileResult.scenario}.`
        );
    } finally {
        await new Promise((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    }
};

await main();
