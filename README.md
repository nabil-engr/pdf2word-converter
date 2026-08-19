# PDFOrbit — Clean Static Architecture

## Structure

```text
pdf2word_clean_architecture/
├── index.html
├── blog.html
├── guides.html
├── word-guides.html
├── faq.html
├── contact.html
├── privacy.html
├── terms.html
├── *.html
├── robots.txt
├── sitemap.xml
└── assets/
    ├── css/
    │   ├── home.css
    │   └── content.css
    ├── js/
    │   ├── converter.js
    │   └── contact.js
    └── images/
        └── blog/
            └── *.webp
```

## Clean-up completed

- Moved homepage CSS to `assets/css/home.css`.
- Moved shared blog/guide/legal CSS to `assets/css/content.css`.
- Moved homepage upload JavaScript to `assets/js/converter.js`.
- Moved contact form JavaScript to `assets/js/contact.js`.
- Organized all blog images under `assets/images/blog/`.
- Replaced all 12 blog/guide thumbnails with the new HD images using the same old filenames.
- Added the requested sidebar button spacing:

```css
.side-card a.btn {
  padding: 11px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

## Before production

1. Replace `https://example.com/` with the real domain in canonical tags and sitemap.
2. Connect the Convert button to the real PDF-to-DOCX API.
3. Connect the contact form to the real backend/email service.
4. Only claim automatic file deletion/security behavior that the backend actually enforces.
