<h1>Visit <a href="https://nabil-engr.github.io/pdf2word-converter/"> PDFOrbit </a> Website to convert your pdf</h1>
# PDFOrbit

PDFOrbit is a static, privacy-first PDF-to-DOCX converter and document-guide website. Text-based PDFs are parsed in the browser and converted to DOCX locally: the selected PDF and generated Word file are not uploaded to PDFOrbit.

## What the converter supports

- Selectable text extraction from PDFs up to 50 MB.
- Basic reading order, line spacing, font size and inferred bold text.
- Password-protected PDFs when the user supplies the password.
- Multi-page DOCX output and automatic browser download.
- Local processing with no account, analytics or application cookies.

The converter does not perform OCR or reproduce complex PDF layout. Scanned pages, images, tables, forms, columns and exact typography may need another tool or manual cleanup. These limitations are stated in the interface and terms.

## Requirements

- Node.js 22.13 or newer.
- A modern browser with JavaScript modules, Web Workers and Blob downloads.

## Local development

```powershell
npm install
npm run check
npm run serve
```

Then open `http://127.0.0.1:4173`. Do not open `index.html` directly with a `file://` URL because the PDF.js worker requires an HTTP origin.

## Commands

- `npm run build` bundles the converter and copies the PDF.js worker into `assets/js/`.
- `npm test` validates all HTML pages, local links, metadata, landmarks, markup balance, styles and DOCX generation.
- `npm run check` rebuilds and runs the complete validation suite.
- `npm run normalize` applies shared static-page requirements idempotently.
- `npm run serve` starts the dependency-free local server on port 4173, or `PORT` when set.

## Production URL configuration

The source stays portable and uses relative canonical and social-image URLs. Before deployment, configure the real HTTPS origin:

```powershell
npm run configure -- --site-url=https://www.your-domain.example
npm test
```

This replaces canonical URLs, adds absolute Open Graph URLs, updates structured data, generates all sitemap entries and adds the sitemap URL to `robots.txt`. Run it only with the final public origin; do not invent or guess a production domain.

## Project structure

```text
assets/
  css/                 Shared homepage and content styles
  images/blog/         WebP guide artwork
  js/                  Browser bundles and shared navigation
scripts/
  build.mjs            Converter bundling
  configure-site.mjs   Production URL and sitemap generation
  normalize-html.mjs   Shared HTML normalization
  serve.mjs            Local static server
  validate.mjs         Automated project checks
src/
  conversion-core.mjs  PDF text-to-DOCX document construction
  converter.mjs        Upload, PDF parsing, progress and download UI
*.html                 Static landing, guide and legal pages
```

## Support and privacy

The contact page sends users to the repository's public GitHub issue tracker. Users are warned not to post documents, passwords or sensitive information. If private support, analytics, advertising or any server-side conversion is added later, update the privacy policy and consent behavior before deployment.
