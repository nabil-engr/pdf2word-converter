import { access, readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Packer } from "docx";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createDocx, groupTextItemsIntoLines } from "../src/conversion-core.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warnings = [];
const htmlPages = (await readdir(root)).filter((name) => name.endsWith(".html")).sort();

function check(condition, message) {
  if (!condition) errors.push(message);
}

function count(html, pattern) {
  return [...html.matchAll(pattern)].length;
}

function createPdfFixture(text) {
  const content = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

for (const page of htmlPages) {
  const html = await readFile(resolve(root, page), "utf8");
  const label = `${page}:`;

  check(count(html, /<title\b/gi) === 1, `${label} expected one title`);
  check(count(html, /<meta\s+name="description"/gi) === 1, `${label} expected one meta description`);
  check(count(html, /<h1\b/gi) === 1, `${label} expected one H1`);
  check(count(html, /<link\s+rel="canonical"/gi) === 1, `${label} expected one canonical URL`);
  check(count(html, /application\/ld\+json/gi) === 1, `${label} expected one structured-data block`);
  check(count(html, /property="og:image"/gi) === 1, `${label} expected one Open Graph image`);
  check(count(html, /name="twitter:card"/gi) === 1, `${label} expected one Twitter card declaration`);
  check(count(html, /<main\b[^>]*\bid="main-content"/gi) === 1, `${label} missing main-content landmark`);
  check(count(html, /class="skip-link"/gi) === 1, `${label} missing skip link`);
  check(html.includes('src="assets/js/site.js"'), `${label} missing shared site script`);
  check(!html.includes("example.com"), `${label} contains placeholder domain`);

  for (const jsonBlock of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    try {
      JSON.parse(jsonBlock[1]);
    } catch {
      errors.push(`${label} invalid JSON-LD`);
    }
  }

  for (const tag of ["div", "section", "main", "header", "footer", "article", "aside"]) {
    const opens = count(html, new RegExp(`<${tag}\\b`, "gi"));
    const closes = count(html, new RegExp(`</${tag}\\s*>`, "gi"));
    check(opens === closes, `${label} unbalanced <${tag}> tags (${opens}/${closes})`);
  }

  const ids = [...html.matchAll(/\bid="([^"]+)"/gi)].map((match) => match[1]);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  check(duplicateIds.length === 0, `${label} duplicate IDs: ${[...new Set(duplicateIds)].join(", ")}`);

  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/gi)) {
    const reference = match[1];
    if (/^(?:https?:|mailto:|tel:|data:|#)/i.test(reference)) continue;
    const localPath = reference.split("#")[0];
    if (!localPath || localPath === "./") continue;
    try {
      await access(resolve(root, localPath));
    } catch {
      errors.push(`${label} missing local target ${reference}`);
    }
  }

  for (const image of html.matchAll(/<img\b([^>]*)>/gi)) {
    check(/\balt="[^"]*"/i.test(image[1]), `${label} image without alt text`);
  }
}

for (const cssFile of ["assets/css/home.css", "assets/css/content.css"]) {
  const css = await readFile(resolve(root, cssFile), "utf8");
  check(count(css, /\{/g) === count(css, /\}/g), `${cssFile}: unbalanced braces`);
}

for (const requiredFile of [
  "assets/js/converter.js",
  "assets/js/pdf.worker.min.mjs",
  "package-lock.json",
]) {
  try {
    await access(resolve(root, requiredFile));
  } catch {
    errors.push(`Missing generated or locked file: ${requiredFile}`);
  }
}

const sitemap = await readFile(resolve(root, "sitemap.xml"), "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
if (sitemapUrls.length === 0) {
  warnings.push("Sitemap is intentionally empty until a production site URL is configured.");
} else {
  check(sitemapUrls.length === htmlPages.length, "Sitemap page count does not match HTML page count");
  check(sitemapUrls.every((url) => /^https:\/\//.test(url)), "Sitemap URLs must use HTTPS absolute URLs");
}

const sampleLines = groupTextItemsIntoLines([
  { str: "Hello", transform: [12, 0, 0, 12, 10, 100], width: 26, fontName: "Regular" },
  { str: "World", transform: [12, 0, 0, 12, 40, 100], width: 30, fontName: "Bold" },
  { str: "Second line", transform: [11, 0, 0, 11, 10, 80], width: 58, fontName: "Regular" },
]);
check(sampleLines.length === 2, "Text extraction should group items into two lines");
check(sampleLines[0]?.map((run) => run.text).join("") === "Hello World", "Text extraction spacing is incorrect");
check(sampleLines[0]?.[1]?.bold === true, "Text extraction should preserve inferred bold text");

const loadingTask = getDocument({
  data: createPdfFixture("Hello PDFOrbit"),
  useSystemFonts: true,
});
const fixturePdf = await loadingTask.promise;
const fixturePage = await fixturePdf.getPage(1);
const fixtureText = await fixturePage.getTextContent();
check(fixtureText.items.some((item) => item.str === "Hello PDFOrbit"), "PDF.js could not extract fixture text");
await loadingTask.destroy();

const docxBuffer = await Packer.toBuffer(createDocx([sampleLines], "sample.pdf"));
check(docxBuffer.length > 1000, "Generated DOCX is unexpectedly small");
check(docxBuffer[0] === 0x50 && docxBuffer[1] === 0x4b, "Generated DOCX is not a ZIP/OOXML file");

if (warnings.length) {
  console.warn(warnings.map((warning) => `WARNING: ${warning}`).join("\n"));
}
if (errors.length) {
  console.error(errors.map((error) => `ERROR: ${error}`).join("\n"));
  process.exit(1);
}

console.log(`Validated ${htmlPages.length} pages, local references, styles, and DOCX generation.`);
