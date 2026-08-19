import { Document, PageBreak, Paragraph, TextRun } from "docx";

function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function itemFontSize(item) {
  const [, , c = 0, d = 0] = item.transform || [];
  const points = Math.hypot(c, d) || item.height || 11;
  return Math.max(8, Math.min(36, points));
}

export function groupTextItemsIntoLines(items) {
  const textItems = items
    .filter((item) => typeof item.str === "string" && item.str.trim())
    .map((item) => ({
      ...item,
      x: item.transform?.[4] || 0,
      y: item.transform?.[5] || 0,
      fontSize: itemFontSize(item),
    }))
    .sort((left, right) => right.y - left.y || left.x - right.x);

  const lines = [];
  for (const item of textItems) {
    const tolerance = Math.max(2, item.fontSize * 0.35);
    let line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= tolerance);
    if (!line) {
      line = { y: item.y, items: [] };
      lines.push(line);
    }
    line.items.push(item);
  }

  return lines
    .sort((left, right) => right.y - left.y)
    .map((line) => {
      const sorted = line.items.sort((left, right) => left.x - right.x);
      const runs = [];
      let previousEnd = null;

      for (const item of sorted) {
        const gap = previousEnd === null ? 0 : item.x - previousEnd;
        const needsSpace = gap > Math.max(1.5, item.fontSize * 0.18);
        const text = `${needsSpace ? " " : ""}${normalizeText(item.str)}`;
        if (text.trim()) {
          runs.push({
            text,
            bold: /bold|black|heavy/i.test(item.fontName || ""),
            size: Math.round(item.fontSize * 2),
          });
        }
        previousEnd = item.x + (item.width || 0);
      }

      return runs;
    })
    .filter((line) => line.length);
}

export function createDocx(pages, sourceName) {
  const children = [];

  pages.forEach((lines, pageIndex) => {
    if (pageIndex > 0) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    lines.forEach((line) => {
      children.push(
        new Paragraph({
          children: line.map(
            (run) =>
              new TextRun({
                text: run.text,
                bold: run.bold,
                size: run.size,
              }),
          ),
          spacing: { after: 80 },
        }),
      );
    });
  });

  return new Document({
    creator: "PDFOrbit",
    description: `Editable text extracted locally from ${sourceName}`,
    title: sourceName.replace(/\.pdf$/i, ""),
    sections: [{ children }],
  });
}
