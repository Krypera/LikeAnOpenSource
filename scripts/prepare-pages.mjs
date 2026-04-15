import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const distDir = path.join(rootDir, "dist");
const staticFiles = [
    "index.html",
    "style.css",
    "script.js",
    "content-config.js",
    "content-service.js"
];
const optionalFiles = ["CNAME", "favicon.ico", "robots.txt", "sitemap.xml"];

const ensureDirectory = (directoryPath) => {
    fs.mkdirSync(directoryPath, { recursive: true });
};

const copyFile = (relativePath) => {
    const sourcePath = path.join(rootDir, relativePath);
    const targetPath = path.join(distDir, relativePath);
    ensureDirectory(path.dirname(targetPath));
    fs.copyFileSync(sourcePath, targetPath);
};

const copyDirectory = (relativePath) => {
    const sourcePath = path.join(rootDir, relativePath);
    const targetPath = path.join(distDir, relativePath);
    fs.cpSync(sourcePath, targetPath, { recursive: true });
};

fs.rmSync(distDir, { recursive: true, force: true });
ensureDirectory(distDir);

staticFiles.forEach(copyFile);
copyDirectory("content");

optionalFiles.forEach((relativePath) => {
    if (fs.existsSync(path.join(rootDir, relativePath))) {
        copyFile(relativePath);
    }
});

console.log("Prepared GitHub Pages artifact in dist/.");
