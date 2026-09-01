import type { ReactElement } from "react";

function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function CguDocument({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactElement[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let key = 0;

  const flushList = () => {
    if (!list || list.items.length === 0) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag
        key={`l-${key++}`}
        className={
          list.ordered
            ? "list-decimal pl-5 space-y-1.5 text-sm leading-relaxed text-foreground"
            : "list-disc pl-5 space-y-1.5 text-sm leading-relaxed text-foreground"
        }
      >
        {list.items.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </Tag>
    );
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }
    if (trimmed === "---") {
      flushList();
      blocks.push(<hr key={`h-${key++}`} className="border-border my-6" />);
      continue;
    }
    if (trimmed.startsWith("# ")) {
      flushList();
      blocks.push(
        <h1 key={`t-${key++}`} className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          {inline(trimmed.slice(2))}
        </h1>
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushList();
      blocks.push(
        <h2 key={`t-${key++}`} className="text-xl font-bold text-foreground pt-4">
          {inline(trimmed.slice(3))}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith("### ")) {
      flushList();
      blocks.push(
        <h3 key={`t-${key++}`} className="text-base font-semibold text-foreground pt-2">
          {inline(trimmed.slice(4))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith("> ")) {
      flushList();
      blocks.push(
        <blockquote
          key={`q-${key++}`}
          className="border-l-4 border-brand pl-4 italic text-sm text-foreground"
        >
          {inline(trimmed.slice(2))}
        </blockquote>
      );
      continue;
    }
    if (/^☐\s/.test(trimmed)) {
      flushList();
      blocks.push(
        <p key={`c-${key++}`} className="text-sm leading-relaxed text-foreground pl-1">
          {inline(trimmed)}
        </p>
      );
      continue;
    }
    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      if (!list || list.ordered) list = { ordered: false, items: [] };
      list.items.push(bullet[1]);
      continue;
    }
    const numbered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (numbered) {
      if (!list || !list.ordered) list = { ordered: true, items: [] };
      list.items.push(numbered[1]);
      continue;
    }
    flushList();
    blocks.push(
      <p key={`p-${key++}`} className="text-sm leading-relaxed text-foreground">
        {inline(trimmed)}
      </p>
    );
  }
  flushList();
  return <div className="space-y-4">{blocks}</div>;
}
