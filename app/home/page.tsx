import type { Metadata } from "next";
import Image from "next/image";
import { cache } from "react";

import { pickStrapiMediaRecord, strapiMediaUrl } from "@/lib/strapi";

/** 与浏览器/搜索结果一致的默认接口（可通过环境变量 STRAPI_URL 覆盖基地址） */
const DEFAULT_STRAPI_ORIGIN = "http://124.220.27.60:1337";

function strapiOrigin(): string {
  const fromEnv = process.env.STRAPI_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  return DEFAULT_STRAPI_ORIGIN;
}

/**
 * landing-page 的 herosection 含媒体字段时，必须 populate（否则 REST 只返回组件标量，没有
 * image.url）。语法与 {@link strapiHomeApiQuery} 一致。
 */
function landingPageApiUrl(): string {
  const qs = new URLSearchParams();
  qs.set("populate[herosection][populate][0]", "image");
  return `${strapiOrigin()}/api/landing-page?${qs.toString()}`;
}

/** 与 {@link strapiMediaUrl} 一致；未配置 STRAPI_* 时仍用当前 Strapi 根地址拼出绝对 URL */
function resolveLandingMediaSrc(path: string | null | undefined): string | null {
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

type LandingHeroBlock = {
  heading: string;
  subheading: string;
  imageSrc: string | null;
  imageAlt: string;
  imageWidth: number;
  imageHeight: number;
};

function parseLandingHeroSections(raw: unknown): LandingHeroBlock[] {
  if (!Array.isArray(raw)) return [];
  const out: LandingHeroBlock[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const heading = typeof o.heading === "string" ? o.heading : "";
    const subheading = typeof o.subheading === "string" ? o.subheading : "";
    const media = pickStrapiMediaRecord(o.image);
    let imageSrc: string | null = null;
    let imageAlt = heading || "配图";
    let imageWidth = 1200;
    let imageHeight = 800;
    if (media?.url) {
      imageSrc = resolveLandingMediaSrc(media.url);
      if (
        typeof media.alternativeText === "string" &&
        media.alternativeText.trim()
      ) {
        imageAlt = media.alternativeText.trim();
      }
      if (typeof media.width === "number") imageWidth = media.width;
      if (typeof media.height === "number") imageHeight = media.height;
    }
    if (heading || subheading || imageSrc) {
      out.push({
        heading,
        subheading,
        imageSrc,
        imageAlt,
        imageWidth,
        imageHeight,
      });
    }
  }
  return out;
}

type LandingPayload = {
  data?: unknown;
  meta?: unknown;
};

/** 兼容 Strapi 4（attributes）与 Strapi 5（扁平 data） */
function displayRecordFromStrapiData(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const attrs = o.attributes;
  if (attrs && typeof attrs === "object" && !Array.isArray(attrs)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      if (k !== "attributes") out[k] = v;
    }
    Object.assign(out, attrs as Record<string, unknown>);
    return out;
  }
  return { ...o };
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

const loadLandingPayload = cache(async (): Promise<{
  payload: LandingPayload;
  apiUrl: string;
} | null> => {
  const apiUrl = landingPageApiUrl();
  try {
    const res = await fetch(apiUrl, {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as LandingPayload;
    return { payload, apiUrl };
  } catch {
    return null;
  }
});

export async function generateMetadata(): Promise<Metadata> {
  const loaded = await loadLandingPayload();
  const data = loaded?.payload.data;
  const rec = displayRecordFromStrapiData(data);
  const titleRaw = rec.title;
  const descRaw = rec.description;
  const title =
    typeof titleRaw === "string" && titleRaw.trim()
      ? titleRaw.trim()
      : "Landing";
  const description =
    typeof descRaw === "string" && descRaw.trim()
      ? descRaw.trim().slice(0, 160)
      : "来自 Strapi 单类型 landing-page";
  return { title, description };
}

export default async function HomeLandingPage() {
  const loaded = await loadLandingPayload();

  if (!loaded) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-24">
        <div className="max-w-lg text-center">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            无法加载 landing-page
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            请确认接口可访问：{" "}
            <code className="break-all rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {landingPageApiUrl()}
            </code>
          </p>
        </div>
      </main>
    );
  }

  const { payload, apiUrl } = loaded;
  const dataRecord = displayRecordFromStrapiData(payload.data);
  const dataEntries = Object.entries(dataRecord).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const heroSections = parseLandingHeroSections(dataRecord.herosection);

  return (
    <main className="flex flex-1 flex-col">
      <div className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
          <p className="text-sm font-medium text-muted-foreground">
            Strapi · landing-page
          </p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {typeof dataRecord.title === "string" && dataRecord.title.trim()
              ? dataRecord.title
              : "Landing page"}
          </h1>
          {typeof dataRecord.description === "string" &&
            dataRecord.description.trim() && (
              <p className="mt-3 max-w-2xl text-base text-muted-foreground">
                {dataRecord.description}
              </p>
            )}
          {heroSections.length > 0 && (
            <div className="mt-10 space-y-10">
              {heroSections.map((block, i) => (
                <div
                  key={`hero-${i}-${block.heading}`}
                  className="grid gap-6 md:grid-cols-2 md:items-center"
                >
                  <div className="min-w-0 space-y-2">
                    {block.heading.trim() && (
                      <h2 className="text-xl font-semibold tracking-tight text-foreground">
                        {block.heading}
                      </h2>
                    )}
                    {block.subheading.trim() && (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {block.subheading}
                      </p>
                    )}
                    {!block.imageSrc && (
                      <p className="text-xs text-muted-foreground">
                        该区块未返回可解析的图片 URL（请确认接口已{" "}
                        <code className="rounded bg-muted px-1 font-mono">
                          populate
                        </code>{" "}
                        herosection.image）
                      </p>
                    )}
                  </div>
                  {block.imageSrc && (
                    <div className="relative aspect-[4/3] w-full max-w-xl overflow-hidden rounded-xl border border-border bg-muted md:justify-self-end">
                      <Image
                        src={block.imageSrc}
                        alt={block.imageAlt}
                        width={block.imageWidth}
                        height={block.imageHeight}
                        className="h-full w-full object-cover"
                        sizes="(max-width:768px) 100vw, 480px"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>


    </main>
  );
}
