export function VeritasOrb({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
      aria-hidden="true"
    >
      <rect x="2" y="10" width="1.75" height="4" rx="0.875" fill="currentColor" fillOpacity="0.35" />
      <rect x="5" y="7" width="1.75" height="10" rx="0.875" fill="currentColor" fillOpacity="0.55" />
      <rect x="8" y="4.5" width="1.75" height="15" rx="0.875" fill="currentColor" fillOpacity="0.8" />
      <rect x="11.125" y="3" width="1.75" height="18" rx="0.875" fill="currentColor" fillOpacity="1" />
      <rect x="14.25" y="4.5" width="1.75" height="15" rx="0.875" fill="currentColor" fillOpacity="0.8" />
      <rect x="17.25" y="7" width="1.75" height="10" rx="0.875" fill="currentColor" fillOpacity="0.55" />
      <rect x="20.25" y="10" width="1.75" height="4" rx="0.875" fill="currentColor" fillOpacity="0.35" />
    </svg>
  );
}
