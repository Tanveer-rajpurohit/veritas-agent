import Image from "next/image";

export function VeritasOrb({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="https://blobatar.dev/?name=veritas"
      alt="Veritas"
      width={size}
      height={size}
      className={`inline-block shrink-0 rounded-full ${className}`}
      unoptimized
    />
  );
}
