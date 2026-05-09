function normalizeBase(url: string): string {
  return url.replace(/\/+$/, "");
}

export function getStrapiURL(): string {
  return process.env.STRAPI_URL ? normalizeBase(process.env.STRAPI_URL) : "";
}

/** 将 Strapi 返回的相对媒体路径转为绝对 URL（用于 Next/Image 的 src） */
export function strapiMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = getStrapiURL();
  if (!base) return null;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/**
 * Strapi 5：`populate=*` 通常不会深度填充「组件」里的 Media，需按组件写嵌套 populate。
 * 此处与当前 Single Type `home` 下的组件 `herosection` 对齐。
 */
export function strapiHomeApiQuery(): string {
  const qs = new URLSearchParams();
  qs.set("populate[herosection][populate]", "*");
  return `api/home?${qs.toString()}`;
}

/** `home` → 组件 `herosection` → `link`（url / text / isExternal） */
export function extractHeroSectionLink(
  payload: unknown
): { url: string; text: string; isExternal: boolean } | null {
  if (!payload || typeof payload !== "object") return null;
  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== "object") return null;
  const section = (data as { herosection?: unknown }).herosection;
  if (!section || typeof section !== "object") return null;
  const link = (section as { link?: unknown }).link;
  if (!link || typeof link !== "object") return null;
  const o = link as Record<string, unknown>;
  const url = o.url;
  const text = o.text;
  if (typeof url !== "string" || !url.trim()) return null;
  if (typeof text !== "string" || !text.trim()) return null;
  return {
    url: url.trim(),
    text: text.trim(),
    isExternal: Boolean(o.isExternal),
  };
}

/** 首页 Single Type `home` + 组件 `herosection` 的展示模型 */
export type HomePageContent = {
  title: string;
  description: string;
  heading: string;
  subheading: string;
  image: { src: string; width: number; height: number; alt: string } | null;
  link: { url: string; text: string; isExternal: boolean } | null;
};

export function parseHomePayload(payload: unknown): HomePageContent | null {
  if (!payload || typeof payload !== "object") return null;
  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;

  const title = typeof d.title === "string" ? d.title : "";
  const description = typeof d.description === "string" ? d.description : "";

  let heading = "";
  let subheading = "";
  let image: HomePageContent["image"] = null;

  const section = d.herosection;
  if (section && typeof section === "object") {
    const s = section as Record<string, unknown>;
    heading = typeof s.heading === "string" ? s.heading : "";
    subheading = typeof s.subheading === "string" ? s.subheading : "";

    const img = s.image;
    if (img && typeof img === "object") {
      const im = img as Record<string, unknown>;
      const rawUrl = im.url;
      const width = im.width;
      const height = im.height;
      const altText = im.alternativeText;
      if (typeof rawUrl === "string") {
        const src = strapiMediaUrl(rawUrl);
        if (src) {
          image = {
            src,
            width: typeof width === "number" ? width : 1200,
            height: typeof height === "number" ? height : 800,
            alt:
              typeof altText === "string" && altText.trim()
                ? altText.trim()
                : heading || title || "配图",
          };
        }
      }
    }
  }

  const link = extractHeroSectionLink(payload);

  return {
    title,
    description,
    heading,
    subheading,
    image,
    link,
  };
}

/** 从 Strapi REST JSON 中递归收集图片绝对地址 */
export function extractStrapiImageUrls(payload: unknown): string[] {
  const seen = new Set<string>();

  function walk(node: unknown): void {
    if (node === null || node === undefined) return;
    if (typeof node === "string") {
      if (node.includes("/uploads/")) {
        const abs = strapiMediaUrl(node);
        if (abs) seen.add(abs);
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node !== "object") return;

    const o = node as Record<string, unknown>;
    const mime = o.mime;
    const url = o.url;
    const id = o.id;

    // Upload 实体：只取原图 url，不再递归 formats，避免同一张图出现 5 个尺寸
    if (
      typeof mime === "string" &&
      mime.startsWith("image/") &&
      typeof url === "string" &&
      url.includes("/uploads/") &&
      (typeof id === "number" || typeof id === "string")
    ) {
      const abs = strapiMediaUrl(url);
      if (abs) seen.add(abs);
      return;
    }

    if (typeof url === "string" && url.includes("/uploads/")) {
      const abs = strapiMediaUrl(url);
      if (abs) seen.add(abs);
    }
    for (const v of Object.values(o)) walk(v);
  }

  walk(payload);
  return [...seen];
}

type StrapiFetchOptions = RequestInit & {
  /** Next.js fetch cache（默认不做长时间缓存，便于开发） */
  next?: { revalidate?: number | false; tags?: string[] };
};

/**
 * 请求 Strapi REST：`path` 可为 `/api/articles` 或完整 URL。
 * 自动附带 `Authorization: Bearer STRAPI_API_TOKEN`（若已配置）。
 */
export async function strapiFetch<T>(
  path: string,
  init?: StrapiFetchOptions
): Promise<T> {
  const base = getStrapiURL();
  if (!base) {
    throw new Error("STRAPI_URL is not set");
  }

  const url = path.startsWith("http")
    ? path
    : `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers = new Headers(init?.headers);
  const token = process.env.STRAPI_API_TOKEN;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strapi ${res.status}: ${text.slice(0, 500)}`);
  }

  return res.json() as Promise<T>;
}
