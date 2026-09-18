"use client";

interface DraftingBottomBarProps {
  pageCount: number;
  wordCount: number;
  charCount: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onFitWidth: () => void;
}

export function DraftingBottomBar({
  pageCount,
  wordCount,
  charCount,
  zoom,
  onZoomChange,
  onFitWidth,
}: DraftingBottomBarProps) {
  return (
    <footer className="flex h-9 shrink-0 items-center justify-between border-t border-[#cbe0f2] bg-white px-4 text-xs text-stone-600 font-mono select-none z-20">
      {/* Left metrics */}
      <div className="flex items-center gap-3">
        <span>
          Total Pages:{" "}
          <strong className="text-stone-900 font-semibold">{pageCount}</strong>
        </span>
        <span className="text-stone-300">|</span>
        <span>
          <strong className="text-stone-900 font-semibold">{wordCount}</strong>{" "}
          words
        </span>
        <span className="text-stone-300">|</span>
        <span className="hidden sm:inline">
          <strong className="text-stone-900 font-semibold">{charCount}</strong>{" "}
          characters
        </span>
      </div>

      {/* Right zoom controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onFitWidth}
          className="rounded px-2 py-0.5 text-[11px] text-stone-600 hover:bg-[#edf4fa] hover:text-[#2c5478] cursor-pointer"
        >
          Fit Width
        </button>

        <div className="h-3 w-px bg-stone-200" />

        <button
          type="button"
          onClick={() => onZoomChange(Math.max(40, zoom - 10))}
          disabled={zoom <= 40}
          className="flex h-6 w-6 items-center justify-center rounded text-stone-600 hover:bg-[#edf4fa] hover:text-[#2c5478] disabled:opacity-30 cursor-pointer font-bold"
        >
          -
        </button>

        <button
          type="button"
          onClick={() => onZoomChange(100)}
          title="Reset zoom to 100%"
          className="w-12 text-center text-[11px] font-semibold text-stone-700 hover:text-[#2c5478] cursor-pointer"
        >
          {zoom}%
        </button>

        <button
          type="button"
          onClick={() => onZoomChange(Math.min(160, zoom + 10))}
          disabled={zoom >= 160}
          className="flex h-6 w-6 items-center justify-center rounded text-stone-600 hover:bg-[#edf4fa] hover:text-[#2c5478] disabled:opacity-30 cursor-pointer font-bold"
        >
          +
        </button>
      </div>
    </footer>
  );
}
