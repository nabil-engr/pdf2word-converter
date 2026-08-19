import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const pages = (await readdir(projectRoot)).filter((name) => name.endsWith(".html"));
const articlePages = new Set([
  "batch-pdf-to-word-workflow.html",
  "cloud-pdf-to-word-workflow.html",
  "edit-pdf-in-word.html",
  "keep-tables-images-pdf-to-word.html",
  "merge-word-documents-guide.html",
  "password-protected-pdf-to-word.html",
  "pdf-to-word-without-losing-formatting.html",
  "pdf-vs-docx-guide.html",
  "reduce-pdf-file-size.html",
  "safe-pdf-conversion.html",
  "scanned-pdf-to-word-ocr-guide.html",
  "translate-pdf-to-word-guide.html",
]);
const collectionPages = new Set(["blog.html", "guides.html", "word-guides.html"]);

function plainText(value) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

for (const page of pages) {
  const path = resolve(projectRoot, page);
  let html = await readFile(path, "utf8");

  html = html.replace(
    /<link rel="canonical" href="https:\/\/example\.com\/[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${page === "index.html" ? "./" : page}">`,
  );
  html = html.replaceAll(
    "https://example.com/assets/images/",
    "assets/images/",
  );
  html = html.replaceAll(
    "Free online PDF to Word converter with simple, privacy-focused file processing.",
    "Free PDF-to-Word text conversion that runs locally in your browser.",
  );

  if (!html.includes('class="skip-link"')) {
    html = html.replace(
      /<body>\s*/,
      '<body>\n    <a class="skip-link" href="#main-content">Skip to main content</a>\n',
    );
  }

  if (!html.includes('id="main-content"')) {
    html = html.replace(/<main(\s|>)/, '<main id="main-content"$1');
  }

  html = html.replace(
    /<nav class="nav-links">/g,
    '<nav class="nav-links" aria-label="Main navigation">',
  );

  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
  const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1]?.trim();
  const openGraphType = articlePages.has(page) ? "article" : "website";
  html = html.replace(
    /<meta property="og:type" content="[^"]+">/,
    `<meta property="og:type" content="${openGraphType}">`,
  );
  if (!html.includes('property="og:image"')) {
    html = html.replace(
      /(<meta name="theme-color")/,
      '<meta property="og:image" content="assets/images/blog/formatting.webp">\n    $1',
    );
  }
  if (!html.includes('name="twitter:card"')) {
    html = html.replace(
      /(<meta name="theme-color")/,
      '<meta name="twitter:card" content="summary_large_image">\n    $1',
    );
  }
  const openGraphImage = html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1];
  if (page !== "index.html" && title && description) {
    let structuredData;
    if (page === "faq.html") {
      const questions = [...html.matchAll(/<details>\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>\s*<\/details>/gi)]
        .map((match) => ({
          "@type": "Question",
          name: plainText(match[1]),
          acceptedAnswer: { "@type": "Answer", text: plainText(match[2]) },
        }));
      structuredData = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        name: title,
        description,
        mainEntity: questions,
      };
    } else if (articlePages.has(page)) {
      structuredData = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title.replace(/\s*\|\s*PDFOrbit$/, ""),
        description,
        image: openGraphImage,
        dateModified: "2026-08-19",
        author: { "@type": "Organization", name: "PDFOrbit" },
        publisher: { "@type": "Organization", name: "PDFOrbit" },
      };
    } else {
      structuredData = {
        "@context": "https://schema.org",
        "@type": collectionPages.has(page)
          ? "CollectionPage"
          : page === "contact.html"
            ? "ContactPage"
            : "WebPage",
        name: title,
        description,
      };
    }

    const script = `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>`;
    if (html.includes('application/ld+json')) {
      html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i, script);
    } else {
      html = html.replace(/\s*<\/head>/, `\n    ${script}\n</head>`);
    }
  }

  if (!html.includes('src="assets/js/site.js"')) {
    html = html.replace(
      /\s*<\/body>/,
      '\n    <script src="assets/js/site.js" defer></script>\n</body>',
    );
  }

  await writeFile(path, html, "utf8");
}

console.log(`Normalized ${pages.length} HTML pages.`);
