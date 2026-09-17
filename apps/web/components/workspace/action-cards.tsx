"use client";

interface ActionCardsProps {
  onOpenCreateMatter: () => void;
  onOpenUpload: () => void;
}

function CreateMatterIllustration() {
  return (
    <svg
      width="68"
      height="68"
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="22"
        y="24"
        width="46"
        height="52"
        rx="3"
        fill="#ffffff"
        stroke="#cbd4dc"
        strokeWidth="1.5"
      />
      <line
        x1="30"
        y1="36"
        x2="56"
        y2="36"
        stroke="#b9d2ea"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="30"
        y1="44"
        x2="60"
        y2="44"
        stroke="#b9d2ea"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="30"
        y1="52"
        x2="50"
        y2="52"
        stroke="#b9d2ea"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 40c0-3 2-5 5-5h16l5 6h42c3 0 5 2 5 5v36c0 3-2 5-5 5H17c-3 0-5-2-5-5V40z"
        fill="#487aa8"
      />
      <path d="M12 46h73v36c0 3-2 5-5 5H17c-3 0-5-2-5-5V46z" fill="#6292c1" />
      <circle
        cx="70"
        cy="72"
        r="11"
        fill="#2c5478"
        stroke="#ffffff"
        strokeWidth="2"
      />
      <path
        d="M70 66v12M64 72h12"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UploadDocumentIllustration() {
  return (
    <svg
      width="68"
      height="68"
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="28"
        y="16"
        width="44"
        height="54"
        rx="3"
        fill="#ffffff"
        stroke="#cbd4dc"
        strokeWidth="1.5"
      />
      <line
        x1="36"
        y1="28"
        x2="60"
        y2="28"
        stroke="#b9d2ea"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="36"
        y1="36"
        x2="64"
        y2="36"
        stroke="#b9d2ea"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="36"
        y1="44"
        x2="52"
        y2="44"
        stroke="#b9d2ea"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="18" y="58" width="64" height="24" rx="3" fill="#487aa8" />
      <path d="M18 64h64v18H18z" fill="#6292c1" />
      <rect x="36" y="66" width="28" height="6" rx="2" fill="#2c5478" />
      <circle
        cx="70"
        cy="46"
        r="11"
        fill="#487aa8"
        stroke="#ffffff"
        strokeWidth="2"
      />
      <path
        d="M70 52V40M65 45l5-5 5 5"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ActionCards({
  onOpenCreateMatter,
  onOpenUpload,
}: ActionCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={onOpenCreateMatter}
        className="group flex items-center gap-4 rounded-lg border border-[#315f88] bg-[#3f719d] p-3.5 text-left shadow-sm transition-[background-color,border-color,transform,box-shadow] hover:border-[#294f72] hover:bg-[#38678f] hover:shadow-md active:scale-[0.99] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#487aa8] focus-visible:ring-offset-2"
      >
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-white/25 bg-white/95 transition-transform duration-200 group-hover:scale-[1.03]">
          <CreateMatterIllustration />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="m-0 font-sans text-sm font-semibold text-white transition-colors">
            Create Matter
          </h2>
          <p className="m-0 pt-1 text-xs leading-snug text-white/75">
            Start a private workspace for records, drafts, and review findings.
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={onOpenUpload}
        className="group flex items-center gap-4 rounded-lg border border-stone-200 bg-white p-3.5 text-left shadow-2xs transition-[border-color,transform,box-shadow] hover:border-[#9bbbd7] hover:shadow-sm active:scale-[0.99] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#487aa8] focus-visible:ring-offset-2"
      >
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-[#edf4fa] transition-transform duration-200 group-hover:scale-105 border border-[#e0ecf7]">
          <UploadDocumentIllustration />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="m-0 font-sans text-sm font-semibold text-stone-900 transition-colors group-hover:text-[#487aa8]">
            Add Documents
          </h2>
          <p className="m-0 pt-0.5 text-xs text-stone-500 leading-snug">
            Add client records, agreements, orders, or pleadings to an existing
            matter.
          </p>
        </div>
      </button>
    </div>
  );
}
