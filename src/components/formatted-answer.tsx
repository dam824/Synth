"use client";

import React, { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  return (
    <div className="my-5 overflow-hidden rounded-xl border border-white/[.09] bg-[#171A19]">
      <div className="flex h-10 items-center justify-between bg-white/[.055] px-4 font-mono text-[11px] text-[#98A49E]">
        <span>{language || "code"}</span>
        <button
          type="button"
          onClick={copy}
          className="rounded px-2 py-1 text-[#C8D2CD] transition hover:bg-white/[.07] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
      <pre className="m-0 max-w-full overflow-x-auto p-4 text-[13px] leading-[1.65] text-[#E7ECE9]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const components: Components = {
  h1: ({ children }) => (
    <h2 className="mb-3 mt-8 text-[21px] font-semibold leading-[1.3] tracking-[-0.015em] text-foreground">
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-8 text-[21px] font-semibold leading-[1.3] tracking-[-0.015em] text-foreground">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-6 text-[17px] font-semibold leading-[1.35] text-foreground">
      {children}
    </h3>
  ),
  p: ({ children }) => <p className="mb-4 mt-0 leading-[1.72]">{children}</p>,
  strong: ({ children }) => (
    <strong className="font-semibold text-[#EEF5F1]">{children}</strong>
  ),
  em: ({ children }) => <em className="text-[#CAD4CF]">{children}</em>,
  ul: ({ children }) => (
    <ul className="mb-5 mt-2 list-disc space-y-2 pl-6 marker:text-[#7A8880]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-5 mt-2 list-decimal space-y-2 pl-6 marker:font-medium marker:text-[#AEBAB4]">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1 leading-[1.68]">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-5 border-l-2 border-accent/45 pl-5 text-[#C5D0CA]">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-8 border-0 border-t border-white/[.09]" />,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-accent underline decoration-accent/35 underline-offset-4 transition hover:decoration-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="my-5 max-w-full overflow-x-auto rounded-xl border border-white/[.09]">
      <table className="w-full min-w-[560px] border-collapse text-left text-[14px]">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-white/[.055] text-foreground">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-white/[.1] px-4 py-3 font-semibold">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-b border-white/[.065] px-4 py-3 align-top leading-[1.55] last:border-b-0">
      {children}
    </td>
  ),
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children }) => {
    const match = /language-([\w-]+)/.exec(className ?? "");
    const code = String(children).replace(/\n$/, "");
    if (match || code.includes("\n")) {
      return <CodeBlock code={code} language={match?.[1]} />;
    }
    return (
      <code className="rounded-md border border-white/[.08] bg-white/[.06] px-1.5 py-0.5 font-mono text-[.88em] text-[#DCE7E1]">
        {children}
      </code>
    );
  },
};

export function FormattedAnswer({
  content,
  compact = false,
}: {
  content: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`min-w-0 max-w-[780px] ${
        compact ? "text-[15px]" : "text-[16px]"
      } text-[#C1CBC6]`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
