"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({
  content,
  className = "",
}: MarkdownContentProps) {
  return (
    <div
      className={`max-w-none text-[14px] leading-7 text-stone-700 ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h2 className="mt-5 mb-2 text-lg font-semibold tracking-tight text-stone-950 first:mt-0">
              {children}
            </h2>
          ),
          h2: ({ children }) => (
            <h3 className="mt-5 mb-2 text-base font-semibold tracking-tight text-stone-950 first:mt-0">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="mt-4 mb-1.5 text-sm font-semibold text-stone-900 first:mt-0">
              {children}
            </h4>
          ),
          h4: ({ children }) => (
            <h5 className="text-[13.5px] font-semibold text-stone-800 mt-2.5 mb-1">
              {children}
            </h5>
          ),
          p: ({ children }) => (
            <p className="my-3 leading-7 text-stone-700 first:mt-0 last:mb-0">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="my-3 list-disc space-y-2 pl-5 marker:text-[#487aa8]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 list-decimal space-y-2 pl-5 marker:font-semibold marker:text-[#487aa8]">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="pl-1 text-[13.5px] leading-6 text-stone-700">
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-stone-900">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-stone-800">{children}</em>
          ),
          code: ({ children }) => (
            <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[12px] text-[#2c5478] border border-stone-200">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="my-3 overflow-x-auto rounded-lg bg-stone-900 p-3.5 font-mono text-[12px] text-stone-100 shadow-xs">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-4 rounded-r-md border-l-2 border-[#487aa8] bg-[#f7fbfe] py-2 pr-3 pl-3 text-stone-600">
              {children}
            </blockquote>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[#2c5478] underline decoration-[#9fc2df] underline-offset-2 hover:text-[#487aa8]"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-5 border-0 border-t border-stone-200" />,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-stone-200">
              <table className="w-full text-left text-xs border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-[#cbe0f2] bg-[#f7fbfe]">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-stone-100">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-stone-50/70 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 font-medium text-stone-700">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-stone-800">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
