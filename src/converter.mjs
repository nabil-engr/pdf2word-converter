import { Packer } from "docx";
import * as pdfjsLib from "pdfjs-dist";
import { createDocx, groupTextItemsIntoLines } from "./conversion-core.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "./pdf.worker.min.mjs",
  import.meta.url,
).toString();

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const PDF_SIGNATURE = "%PDF-";

const elements = {
  chooseButton: document.getElementById("chooseBtn"),
  convertButton: document.getElementById("convertBtn"),
  dropZone: document.getElementById("dropZone"),
  fileInput: document.getElementById("fileInput"),
  fileName: document.getElementById("fileName"),
  fileSize: document.getElementById("fileSize"),
  password: document.getElementById("pdfPassword"),
  progress: document.getElementById("conversionProgress"),
  removeButton: document.getElementById("removeFile"),
  selectedFile: document.getElementById("selectedFile"),
  status: document.getElementById("conversionStatus"),
  toast: document.getElementById("toast"),
};

let currentFile = null;
let toastTimer = null;

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  toastTimer = window.setTimeout(
    () => elements.toast.classList.remove("show"),
    3600,
  );
}

function setStatus(message, state = "idle") {
  elements.status.textContent = message;
  elements.status.dataset.state = state;
}

function resetFile() {
  currentFile = null;
  elements.fileInput.value = "";
  elements.password.value = "";
  elements.selectedFile.classList.remove("show");
  elements.convertButton.disabled = true;
  elements.progress.hidden = true;
  elements.progress.value = 0;
  setStatus("");
}

async function hasPdfSignature(file) {
  const header = await file.slice(0, PDF_SIGNATURE.length).arrayBuffer();
  return new TextDecoder("ascii").decode(header) === PDF_SIGNATURE;
}

async function setFile(file) {
  resetFile();
  if (!file) return;

  if (file.size === 0) {
    showToast("That file is empty. Choose a PDF that contains data.");
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    showToast("This browser converter accepts PDFs up to 50 MB.");
    return;
  }

  const nameLooksRight = file.name.toLowerCase().endsWith(".pdf");
  if (!nameLooksRight || !(await hasPdfSignature(file))) {
    showToast("That file is not a valid PDF.");
    return;
  }

  currentFile = file;
  elements.fileName.textContent = file.name;
  elements.fileSize.textContent = formatBytes(file.size);
  elements.selectedFile.classList.add("show");
  elements.convertButton.disabled = false;
  setStatus("Ready to convert locally in this browser.", "success");
}

async function extractPages(pdf, onProgress) {
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(groupTextItemsIntoLines(content.items));
    onProgress(pageNumber, pdf.numPages);
    page.cleanup();
  }
  return pages;
}

function downloadBlob(blob, sourceName) {
  const outputName = `${sourceName.replace(/\.pdf$/i, "") || "converted"}.docx`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = outputName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function friendlyError(error) {
  if (error?.name === "PasswordException") {
    return "This PDF needs a valid password. Enter it and try again.";
  }
  if (error?.name === "InvalidPDFException") {
    return "This PDF is damaged or uses an unsupported structure.";
  }
  return "Conversion failed. Try another text-based PDF.";
}

async function convertCurrentFile() {
  if (!currentFile) return;

  elements.convertButton.disabled = true;
  elements.convertButton.setAttribute("aria-busy", "true");
  elements.progress.hidden = false;
  elements.progress.value = 0;
  setStatus("Opening PDF…", "working");

  let loadingTask;
  let pdf;
  try {
    const data = new Uint8Array(await currentFile.arrayBuffer());
    loadingTask = pdfjsLib.getDocument({
      data,
      password: elements.password.value || undefined,
    });
    pdf = await loadingTask.promise;
    const pages = await extractPages(pdf, (current, total) => {
      elements.progress.value = Math.round((current / total) * 80);
      setStatus(`Reading page ${current} of ${total}…`, "working");
    });

    const textCount = pages.flat(2).reduce(
      (count, run) => count + run.text.trim().length,
      0,
    );
    if (textCount < 1) {
      throw new Error("NO_TEXT");
    }

    elements.progress.value = 90;
    setStatus("Creating Word document…", "working");
    const blob = await Packer.toBlob(createDocx(pages, currentFile.name));
    elements.progress.value = 100;
    downloadBlob(blob, currentFile.name);
    setStatus("Done. Your Word document has been downloaded.", "success");
    showToast("Conversion complete.");
  } catch (error) {
    const message =
      error?.message === "NO_TEXT"
        ? "No selectable text was found. Scanned PDFs require OCR."
        : friendlyError(error);
    setStatus(message, "error");
    showToast(message);
  } finally {
    await loadingTask?.destroy();
    elements.convertButton.disabled = !currentFile;
    elements.convertButton.removeAttribute("aria-busy");
  }
}

elements.chooseButton.addEventListener("click", (event) => {
  event.stopPropagation();
  elements.fileInput.click();
});
elements.dropZone.addEventListener("click", () => elements.fileInput.click());
elements.fileInput.addEventListener("change", () => setFile(elements.fileInput.files[0]));

["dragenter", "dragover"].forEach((eventName) => {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.add("drag");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove("drag");
  });
});

elements.dropZone.addEventListener("drop", (event) => {
  const [file] = event.dataTransfer.files;
  setFile(file);
});
elements.removeButton.addEventListener("click", resetFile);
elements.convertButton.addEventListener("click", convertCurrentFile);
