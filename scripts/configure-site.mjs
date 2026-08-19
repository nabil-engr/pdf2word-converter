import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const siteArgument = process.argv.find((argument) => argument.startsWith("--site-url="));
const siteUrl = siteArgument?.slice("--site-url=".length).replace(/\/+$/, "");

if (!siteUrl || !/^https:\/\/[^/]+/i.test(siteUrl)) {
  console.error("Usage: npm run configure -- --site-url=https://your-domain.example");
  process.exit(1);
}

const pages = (await readdir(projectRoot))
  .filter((name) => name.endsWith(".html"))
  .sort((left, right) => (left === "index.html" ? -1 : right === "index.html" ? 1 : left.localeCompare(right)));

for (const page of pages) {
  const path = resolve(projectRoot, page);
  let html = await readFile(path, "utf8");
  const publicPath = page === "index.html" ? "/" : `/${page}`;
  const canonical = `${siteUrl}${publicPath}`;

  html = html.replace(
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${canonical}">`,
  );
  html = html.replace(
    /<meta property="og:url" content="[^"]*"\s*\/?>\s*/,
    "",
  );
  const canonicalTag = `<link rel="canonical" href="${canonical}">`;
  html = html.replace(
    canonicalTag,
    `${canonicalTag}\n    <meta property="og:url" content="${canonical}">`,
  );
  html = html.replace(
    /(<meta property="og:image" content=")(?!(?:https?:)?\/\/)([^"]+)(")/,
    `$1${siteUrl}/$2$3`,
  );
  html = html.replace(
    /("image"\s*:\s*")(?!(?:https?:)?\/\/)([^"]+)(")/,
    `$1${siteUrl}/$2$3`,
  );
  html = html.replace(
    /("description"\s*:\s*"[^"]*")(?:,?\s*"url"\s*:\s*"[^"]*")?/,
    `$1,"url":"${canonical}"`,
  );
  await writeFile(path, html, "utf8");
}

const sitemapEntries = pages
  .map((page) => `  <url><loc>${siteUrl}${page === "index.html" ? "/" : `/${page}`}</loc></url>`)
  .join("\n");
await writeFile(
  resolve(projectRoot, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`,
  "utf8",
);
await writeFile(
  resolve(projectRoot, "robots.txt"),
  `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`,
  "utf8",
);

console.log(`Configured ${pages.length} pages for ${siteUrl}.`);
