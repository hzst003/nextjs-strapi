import type { Metadata } from "next";
import Image from "next/image";
import { cache } from "react";

import {
  getStrapiURL,
  pickStrapiMediaRecord,
  strapiFetch,
  strapiMediaUrl,
} from "@/lib/strapi";

const DEFAULT_STRAPI_ORIGIN = "http://124.220.27.60:1337";

function strapiOrigin(): string {
  const fromEnv = getStrapiURL();
  if (fromEnv) return fromEnv;
  return DEFAULT_STRAPI_ORIGIN;
}

function linkpageApiPath(): string {
  const qs = new URLSearchParams();
  qs.set("populate[logolink][populate]", "image");
  return `api/linkpage?${qs.toString()}`;
}

function resolveMediaSrc(path: string | null | undefined): string | null {
  if (!path || typeof path !== "string") return null;
  const trimmed = path.trim();
  if (!trimmed) return null;
  const fromEnv = strapiMediaUrl(trimmed);
  if (fromEnv) return fromEnv;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const base = strapiOrigin();
  const p = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${base}${p}`;
}

function normalizeHref(href: string): string {
  const t = href.trim();
  if (!t) return "#";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t.replace(/^\/+/, "")}`;
}

type LinkpagePayload = {
  data: unknown;
};

type LogoLinkItem = {
  id: number;
  text: string;
  href: string;
  image?: Record<string, unknown> | null;
};

const loadLinkpagePayload = cache(async (): Promise<LinkpagePayload | null> => {
  const path = linkpageApiPath();
  try {
    if (getStrapiURL()) {
      return await strapiFetch<LinkpagePayload>(path, { cache: "no-store" });
    }
    const res = await fetch(`${strapiOrigin()}/${path}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as LinkpagePayload;
  } catch {
    return null;
  }
});

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "网址导航",
    description: "常用网站快捷入口",
  };
}

function parseLogoLinks(data: unknown): LogoLinkItem[] {
  if (!data || typeof data !== "object") return [];
  const logolink = (data as Record<string, unknown>).logolink;
  if (!Array.isArray(logolink)) return [];
  const out: LogoLinkItem[] = [];
  for (const item of logolink) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "number" ? o.id : 0;
    const text = typeof o.text === "string" ? o.text : "";
    const href = typeof o.href === "string" ? o.href : "";
    const image =
      o.image && typeof o.image === "object"
        ? (o.image as Record<string, unknown>)
        : null;
    if (!text && !href) continue;
    out.push({ id, text, href, image });
  }
  return out;
}

function LogoLinkRow({ item }: { item: LogoLinkItem }) {
  const media = item.image ? pickStrapiMediaRecord(item.image) : null;
  const imageSrc = media?.url ? resolveMediaSrc(media.url) : null;
  const imageAlt = item.text || "logo";
  const url = normalizeHref(item.href);

  return (
    <li>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-colors hover:border-primary/30 hover:bg-muted/40"
      >
        {imageSrc ? (
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
            <Image
              src={imageSrc}
              alt={imageAlt}
              width={media?.width ?? 40}
              height={media?.height ?? 40}
              className="h-8 w-8 object-contain"
              unoptimized={imageSrc.endsWith(".svg")}
            />
          </span>
        ) : (
          <span className="h-10 w-10 shrink-0 rounded-lg border border-dashed border-border bg-muted/30" />
        )}
        <span className="min-w-0 flex-1">
          {item.text ? (
            <span className="block font-medium text-foreground group-hover:text-primary">
              {item.text}
            </span>
          ) : null}
          {item.href ? (
            <span className="mt-0.5 block truncate text-sm text-muted-foreground">
              {item.href}
            </span>
          ) : null}
        </span>
      </a>
    </li>
  );
}

export default async function LinkPage02() {
  const payload = await loadLinkpagePayload();

  if (!payload?.data) {
    return <main className="flex flex-1 flex-col bg-background" />;
  }

  const logoLinks = parseLogoLinks(payload.data);

  if (logoLinks.length === 0) {
    return <main className="flex flex-1 flex-col bg-background" />;
  }

  return (
    <main className="flex flex-1 flex-col bg-background">
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:py-14">
        <ul className="flex flex-col gap-3">
          {logoLinks.map((item) => (
            <LogoLinkRow key={item.id} item={item} />
          ))}
        </ul>
      </div>
    </main>
  );
}
