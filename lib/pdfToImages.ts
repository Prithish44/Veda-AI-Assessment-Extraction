"use client";

import { PageImage } from "./types";

const PDFJS_VERSION = "3.11.174";

// pdfjs-dist must only ever be loaded in the browser.
async function loadPdfjs() {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;
  return pdfjsLib;
}

function dataUrlToBase64(dataUrl: string): string {
  const idx = dataUrl.indexOf(",");
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

async function loadImageDims(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

async function convertImageFile(file: File): Promise<PageImage[]> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const { width, height } = await loadImageDims(dataUrl);
  return [
    {
      page: 1,
      dataUrl,
      base64: dataUrlToBase64(dataUrl),
      mimeType: file.type || "image/jpeg",
      width,
      height,
    },
  ];
}

async function convertPdfFile(file: File, maxWidth = 1600): Promise<PageImage[]> {
  const pdfjsLib = await loadPdfjs();
  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: PageImage[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2.2, maxWidth / baseViewport.width);
    const viewport = page.getViewport({ scale: Math.max(scale, 1) });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    pages.push({
      page: pageNum,
      dataUrl,
      base64: dataUrlToBase64(dataUrl),
      mimeType: "image/jpeg",
      width: canvas.width,
      height: canvas.height,
    });
  }
  return pages;
}

/**
 * Converts an uploaded File (PDF or image) into an ordered array of page
 * images, each with a display data URL and a base64 payload ready to send
 * to the extraction API.
 */
export async function convertFileToPageImages(file: File): Promise<PageImage[]> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return convertPdfFile(file);
  }
  if (file.type.startsWith("image/")) {
    return convertImageFile(file);
  }
  throw new Error(`Unsupported file type: ${file.type || file.name}`);
}
