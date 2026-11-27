import type { SVGProps } from "react";

export function WordDocIcon({
  size = 16,
  className = "",
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M11.3327 1.99982H13.9994C14.1762 1.99982 14.3457 2.07006 14.4708 2.19508C14.5958 2.3201 14.666 2.48967 14.666 2.66648V13.3332C14.666 13.51 14.5958 13.6795 14.4708 13.8046C14.3457 13.9296 14.1762 13.9998 13.9994 13.9998H11.3327V1.99982ZM1.90536 1.91782L10.2854 0.721151C10.3326 0.714375 10.3807 0.71782 10.4265 0.731254C10.4723 0.744688 10.5147 0.767798 10.5508 0.799021C10.5869 0.830244 10.6158 0.868852 10.6357 0.912235C10.6556 0.955617 10.6659 1.00276 10.666 1.05048V14.9492C10.6659 14.9968 10.6556 15.0439 10.6358 15.0872C10.6159 15.1305 10.587 15.1691 10.551 15.2003C10.515 15.2315 10.4727 15.2547 10.427 15.2682C10.3813 15.2816 10.3332 15.2852 10.286 15.2785L1.9047 14.0818C1.74578 14.0592 1.60036 13.98 1.49516 13.8587C1.38995 13.7375 1.33203 13.5823 1.33203 13.4218V2.57782C1.33203 2.41729 1.38995 2.26216 1.49516 2.14091C1.60036 2.01967 1.74644 1.94045 1.90536 1.91782ZM7.3327 5.33315V8.65915L5.99936 7.33315L4.6727 8.66648L4.66603 5.33315H3.3327V10.6665H4.66603L5.99936 9.33315L7.3327 10.6665H8.66603V5.33315H7.3327Z"
        fill="#0070B1"
      />
    </svg>
  );
}

export function PdfDocIcon({
  size = 16,
  className = "",
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M12.6667 2H3.33333C2.6 2 2 2.6 2 3.33333V12.6667C2 13.4 2.6 14 3.33333 14H12.6667C13.4 14 14 13.4 14 12.6667V3.33333C14 2.6 13.4 2 12.6667 2ZM6.33333 7.66667C6.33333 8.2 5.86667 8.66667 5.33333 8.66667H4.66667V10H3.66667V6H5.33333C5.86667 6 6.33333 6.46667 6.33333 7V7.66667ZM9.66667 9C9.66667 9.53333 9.2 10 8.66667 10H7V6H8.66667C9.2 6 9.66667 6.46667 9.66667 7V9ZM12.3333 7H11.3333V7.66667H12.3333V8.66667H11.3333V10H10.3333V6H12.3333V7ZM8 7H8.66667V9H8V7ZM4.66667 7H5.33333V7.66667H4.66667V7Z"
        fill="#D00000"
      />
    </svg>
  );
}

export function MarkdownDocIcon({
  size = 16,
  className = "",
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect
        x="1.5"
        y="2.5"
        width="13"
        height="11"
        rx="1.5"
        stroke="#487aa8"
        strokeWidth="1.2"
      />
      <path
        d="M3.5 10.5V5.5L5.5 7.5L7.5 5.5V10.5M10.5 7.5L12 9.5M12 9.5L13.5 7.5M12 9.5V5.5"
        stroke="#2c5478"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export { ColoredFileIcon } from "../ui/colored-file-icon";
export type { ColoredFileIconProps, FileCategory, FileFormat, IconSize } from "../ui/colored-file-icon";

