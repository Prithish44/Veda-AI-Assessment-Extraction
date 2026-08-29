"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { AnswerRegion, PageImage } from "@/lib/types";

interface Props {
  pages: PageImage[];
  regions: AnswerRegion[];
  label?: string | null;
}

export default function AnswerSheetViewer({ pages, regions, label }: Props) {
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    if (regions.length > 0) {
      setPageIndex(Math.max(0, Math.min(pages.length - 1, regions[0].page - 1)));
    }
  }, [regions, pages.length]);

  if (pages.length === 0) {
    return <div className="flex items-center justify-center h-full text-muted text-sm">No answer sheet loaded</div>;
  }

  const page = pages[pageIndex];
  const regionsOnPage = regions.filter((r) => r.page === pageIndex + 1);
  const pagesWithRegions = new Set(regions.map((r) => r.page));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 h-14 border-b border-border shrink-0">
        <h2 className="text-sm font-semibold text-ink">Answer Sheet</h2>
        {label && (
          <span className="text-xs font-medium text-good bg-good-light border border-good/20 rounded-full px-2.5 py-1">
            Highlighting {label}
          </span>
        )}
      </div>

      {pages.length > 1 && (
        <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-border overflow-x-auto scrollbar-thin shrink-0">
          {pages.map((p, i) => (
            <button
              key={p.page}
              onClick={() => setPageIndex(i)}
              className={clsx(
                "relative shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors",
                i === pageIndex
                  ? "bg-ink text-white border-ink"
                  : "bg-canvas text-muted border-border hover:border-ink/30"
              )}
            >
              Page {p.page}
              {pagesWithRegions.has(p.page) && i !== pageIndex && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-good border border-white" />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto scrollbar-thin p-5 flex justify-center bg-canvas">
        <div className="relative inline-block rounded-lg overflow-hidden shadow-card bg-white" style={{ maxWidth: "100%" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={page.dataUrl}
            alt={`Answer sheet page ${pageIndex + 1}`}
            className="block max-w-full h-auto select-none"
          />
          {regionsOnPage.map((r, i) => (
            <Highlight key={i} box={r.box} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Highlight({ box }: { box: [number, number, number, number] }) {
  const [y0, x0, y1, x1] = box;
  const top = y0 / 10;
  const left = x0 / 10;
  const width = (x1 - x0) / 10;
  const height = (y1 - y0) / 10;

  return (
    <div
      className="absolute pointer-events-none fade-in"
      style={{ top: `${top}%`, left: `${left}%`, width: `${width}%`, height: `${height}%` }}
    >
      <div
        className="w-full h-full rounded-lg"
        style={{
          border: "2px solid #1EA672",
          background: "rgba(30,166,114,0.10)",
          boxShadow: "0 0 0 3px rgba(30,166,114,0.10)",
        }}
      />
    </div>
  );
}
