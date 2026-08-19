import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(projectRoot, "assets/js");

await mkdir(outputDirectory, { recursive: true });
await build({
  bundle: true,
  entryPoints: [resolve(projectRoot, "src/converter.mjs")],
  format: "esm",
  legalComments: "external",
  minify: true,
  outfile: resolve(outputDirectory, "converter.js"),
  sourcemap: false,
  target: ["es2022"],
});

await copyFile(
  resolve(projectRoot, "node_modules/pdfjs-dist/build/pdf.worker.min.mjs"),
  resolve(outputDirectory, "pdf.worker.min.mjs"),
);

console.log("Built browser converter and PDF worker.");
