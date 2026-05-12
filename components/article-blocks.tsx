import type { ReactNode } from "react";
import { strapiMediaUrl } from "@/lib/strapi";

function renderInlines(children: unknown[]): ReactNode[] {
  return children.flatMap((c, i) => {
    if (!c || typeof c !== "object") return [];
    const o = c as Record<string, unknown>;
    const t = o.type;
    if (t === "text") {
      let el: ReactNode = String(o.text ?? "");
      if (o.code)
        el = (
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]">
            {el}
          </code>
        );
      if (o.bold) el = <strong className="font-semibold">{el}</strong>;
      if (o.italic) el = <em>{el}</em>;
      if (o.underline) el = <u>{el}</u>;
      if (o.strikethrough) el = <del>{el}</del>;
      return [<span key={i}>{el}</span>];
    }
    if (t === "link" && typeof o.url === "string") {
      const ch = Array.isArray(o.children) ? o.children : [];
      return [
        <a
          key={i}
          href={o.url}
          className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
          target="_blank"
          rel="noopener noreferrer"
        >
          {renderInlines(ch)}
        </a>,
      ];
    }
    return [];
  });
}

function renderBlock(node: unknown, key: number): ReactNode {
  if (!node || typeof node !== "object") return null;
  const n = node as Record<string, unknown>;
  const type = typeof n.type === "string" ? n.type : "";
  const kids = Array.isArray(n.children) ? n.children : [];

  switch (type) {
    case "paragraph":
      return (
        <p key={key} className="mb-4 leading-relaxed text-foreground">
          {renderInlines(kids)}
        </p>
      );
    case "heading": {
      const levelRaw = n.level;
      const level =
        typeof levelRaw === "number"
          ? Math.min(6, Math.max(1, levelRaw))
          : 2;
      const cls =
        "scroll-mt-24 font-semibold tracking-tight text-foreground text-balance";
      const inner = renderInlines(kids);
      if (level === 1)
        return (
          <h1 key={key} className={`mt-10 mb-4 text-3xl ${cls}`}>
            {inner}
          </h1>
        );
      if (level === 2)
        return (
          <h2 key={key} className={`mt-10 mb-3 text-2xl ${cls}`}>
            {inner}
          </h2>
        );
      if (level === 3)
        return (
          <h3 key={key} className={`mt-8 mb-2 text-xl ${cls}`}>
            {inner}
          </h3>
        );
      if (level === 4)
        return (
          <h4 key={key} className={`mt-6 mb-2 text-lg ${cls}`}>
            {inner}
          </h4>
        );
      if (level === 5)
        return (
          <h5 key={key} className={`mt-6 mb-2 text-base ${cls}`}>
            {inner}
          </h5>
        );
      return (
        <h6 key={key} className={`mt-6 mb-2 text-sm ${cls}`}>
          {inner}
        </h6>
      );
    }
    case "list": {
      const ordered = n.format === "ordered";
      const ListTag = ordered ? "ol" : "ul";
      const listCls = ordered
        ? "mb-4 ml-6 list-decimal space-y-2 text-foreground"
        : "mb-4 ml-6 list-disc space-y-2 text-foreground";
      return (
        <ListTag key={key} className={listCls}>
          {kids.map((item, j) => renderBlock(item, j))}
        </ListTag>
      );
    }
    case "list-item":
      return (
        <li key={key} className="leading-relaxed">
          {kids.map((item, j) => renderBlock(item, j))}
        </li>
      );
    case "quote":
      return (
        <blockquote
          key={key}
          className="mb-4 border-l-4 border-primary/30 pl-4 italic text-muted-foreground"
        >
          {kids.map((item, j) => renderBlock(item, j))}
        </blockquote>
      );
    case "code": {
      const inner = renderInlines(kids);
      return (
        <pre
          key={key}
          className="mb-4 overflow-x-auto rounded-lg border border-border bg-muted/50 p-4 text-sm"
        >
          <code>{inner}</code>
        </pre>
      );
    }
    case "image": {
      const imgRaw = n.image;
      if (!imgRaw || typeof imgRaw !== "object") return null;
      const img = imgRaw as Record<string, unknown>;
      const rawUrl = typeof img.url === "string" ? img.url.trim() : "";
      if (!rawUrl) return null;
      const url = strapiMediaUrl(rawUrl) ?? rawUrl;
      const alt =
        typeof n.alt === "string" && n.alt.trim()
          ? n.alt.trim()
          : typeof img.alternativeText === "string"
            ? img.alternativeText.trim()
            : "";
      return (
        <figure key={key} className="my-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- Strapi 外链与首页一致 */}
          <img
            src={url}
            alt={alt || "插图"}
            className="max-h-[480px] w-full rounded-lg border border-border object-contain"
          />
        </figure>
      );
    }
    default:
      return null;
  }
}

/** 渲染 Strapi Blocks（Rich text Blocks）为可读 HTML 结构 */
export function ArticleBlocks({ blocks }: { blocks: unknown[] }) {
  return (
    <div className="article-blocks max-w-none">
      {blocks.map((b, i) => renderBlock(b, i))}
    </div>
  );
}
