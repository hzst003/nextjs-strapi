function normalizeBase(url: string): string {
  return url.replace(/\/+$/, "");
}

export function getStrapiURL(): string {
  return process.env.STRAPI_URL ? normalizeBase(process.env.STRAPI_URL) : "";
}

/**
 * 浏览器加载媒体用的 Strapi 根地址（与 {@link getStrapiURL} 可分离）。
 * 若启用 {@link strapiUploadProxyEnabled}，浏览器侧可走同源 `/api/strapi-upload`，可不依赖公网 HTTPS Strapi。
 */
export function getStrapiPublicURL(): string {
  const pub =
    process.env.STRAPI_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    process.env.STRAPI_URL;
  return pub ? normalizeBase(pub) : "";
}

/** HTTPS 前端 + HTTP Strapi 时设为 `true`：媒体改走本站代理，避免混合内容拦截 */
export function strapiUploadProxyEnabled(): boolean {
  const v = process.env.STRAPI_PROXY_UPLOADS;
  return v === "1" || v === "true";
}

/** 从 Strapi 返回的路径中取出 `/uploads/` 之后的对象 key（如 `foo/bar.jpg`） */
export function strapiUploadsObjectKey(path: string): string | null {
  try {
    const pathname =
      path.startsWith("http://") || path.startsWith("https://")
        ? new URL(path).pathname
        : path.startsWith("/")
          ? path
          : `/${path}`;
    const marker = "/uploads/";
    const i = pathname.indexOf(marker);
    if (i === -1) return null;
    const key = pathname.slice(i + marker.length).replace(/^\/+/, "");
    return key || null;
  } catch {
    return null;
  }
}

function strapiUploadsKeySafe(key: string): boolean {
  if (!key || key.includes("..") || key.includes("\\")) return false;
  return key.split("/").every((s) => s.length > 0 && s !== "." && s !== "..");
}

/** 将 Strapi 返回的相对媒体路径转为浏览器可用的 src（直连 Strapi 或同源代理） */
export function strapiMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;

  if (strapiUploadProxyEnabled()) {
    const key = strapiUploadsObjectKey(path);
    if (key && strapiUploadsKeySafe(key)) {
      return `/api/strapi-upload/${key.split("/").map(encodeURIComponent).join("/")}`;
    }
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return null;
  }

  const base = getStrapiPublicURL();

  // Strapi 常把媒体存成「完整 URL」，其 host 可能是后台里的 localhost/内网；用 STRAPI_PUBLIC_URL / STRAPI_URL 重拼成浏览器可打开的地址。
  if (path.startsWith("http://") || path.startsWith("https://")) {
    if (!base) return path;
    try {
      const u = new URL(path);
      if (u.pathname.includes("/uploads/")) {
        const pathWithQuery = `${u.pathname}${u.search}`;
        return `${base}${pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`}`;
      }
    } catch {
      return null;
    }
    return path;
  }

  if (!base) return null;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/**
 * Strapi 5 REST：组件内的媒体必须嵌套 populate，wildcard 往往拿不到 `image`。
 * @see https://docs.strapi.io/cms/api/rest/populate-select
 */
export function strapiHomeApiQuery(): string {
  const qs = new URLSearchParams();
  qs.set("populate[herosection][populate][0]", "image");
  qs.set("populate[herosection][populate][1]", "link");
  return `api/home?${qs.toString()}`;
}

/**
 * 网址导航集合类型 `link-pages`：取最新发布的一条；正文分组在字段 `jsoncontent`（JSON）
 * 或与单类型一致的 `sections` 组件列表。
 * Public 角色需对 `link-pages` 开放 `find`。
 */
export function strapiLinkPagesApiQuery(): string {
  const qs = new URLSearchParams();
  qs.set("pagination[pageSize]", "1");
  qs.set("sort", "publishedAt:desc");
  return `api/link-pages?${qs.toString()}`;
}

export type LinkPageNavLink = {
  title: string;
  url: string;
  description?: string;
};

export type LinkPageNavSection = {
  title: string;
  links: LinkPageNavLink[];
};

/** Strapi 导航页解析后的展示模型 */
export type LinkPageContent = {
  subtitle: string;
  heading: string;
  lead: string;
  sections: LinkPageNavSection[];
};

function readStrapiDocFields(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const attrs = o.attributes;
  if (attrs && typeof attrs === "object") {
    return attrs as Record<string, unknown>;
  }
  return o;
}

function parseNavSectionsFromUnknown(
  sectionsRaw: unknown
): LinkPageNavSection[] {
  const sections: LinkPageNavSection[] = [];
  if (!Array.isArray(sectionsRaw)) return sections;
  for (const item of sectionsRaw) {
    const s = readStrapiDocFields(item);
    if (!s) continue;
    const title = typeof s.title === "string" ? s.title.trim() : "";
    const linksRaw = s.links;
    const links: LinkPageNavLink[] = [];
    if (Array.isArray(linksRaw)) {
      for (const L of linksRaw) {
        const lo = readStrapiDocFields(L);
        if (!lo) continue;
        const lt = typeof lo.title === "string" ? lo.title.trim() : "";
        const url = typeof lo.url === "string" ? lo.url.trim() : "";
        if (!lt || !url) continue;
        const desc =
          typeof lo.description === "string" ? lo.description.trim() : "";
        links.push({
          title: lt,
          url,
          ...(desc ? { description: desc } : {}),
        });
      }
    }
    if (title && links.length > 0) sections.push({ title, links });
  }
  return sections;
}

/**
 * 解析导航接口响应：
 * - 集合 `GET /api/link-pages`：`data` 为数组，取第一条；分组字段多为 `jsoncontent`
 * - 单条 `GET /api/link-page`：`data` 为对象；分组多为 `sections`
 */
export function parseLinkPagePayload(payload: unknown): LinkPageContent | null {
  if (!payload || typeof payload !== "object") return null;
  const data = (payload as { data?: unknown }).data;

  let d: Record<string, unknown> | null = null;
  if (Array.isArray(data)) {
    if (data.length === 0) return null;
    d = readStrapiDocFields(data[0]);
  } else {
    d = readStrapiDocFields(data);
  }
  if (!d) return null;

  const subtitle = typeof d.subtitle === "string" ? d.subtitle : "";
  const heading = typeof d.heading === "string" ? d.heading : "";
  const lead = typeof d.lead === "string" ? d.lead : "";

  const sectionsRaw = d.jsoncontent ?? d.sections;
  const sections = parseNavSectionsFromUnknown(sectionsRaw);

  if (sections.length === 0) return null;
  return { subtitle, heading, lead, sections };
}

/** 解析 Strapi 媒体 JSON：扁平对象，或 `{ data }` / `attributes`，含 formats 兜底 */
function pickStrapiMediaRecord(raw: unknown): {
  url: string;
  width?: number;
  height?: number;
  alternativeText?: string | null;
} | null {
  function fromObject(o: Record<string, unknown>): {
    url: string;
    width?: number;
    height?: number;
    alternativeText?: string | null;
  } | null {
    let urlVal = o.url;
    if (typeof urlVal !== "string" || !urlVal.trim()) {
      const formats = o.formats;
      if (formats && typeof formats === "object") {
        for (const key of ["large", "medium", "small", "thumbnail"] as const) {
          const slot = (formats as Record<string, unknown>)[key];
          if (slot && typeof slot === "object") {
            const u = (slot as Record<string, unknown>).url;
            if (typeof u === "string" && u.trim()) {
              urlVal = u;
              break;
            }
          }
        }
      }
    }
    if (typeof urlVal !== "string" || !urlVal.trim()) return null;
    return {
      url: urlVal.trim(),
      width: typeof o.width === "number" ? o.width : undefined,
      height: typeof o.height === "number" ? o.height : undefined,
      alternativeText:
        typeof o.alternativeText === "string" ? o.alternativeText : null,
    };
  }

  if (!raw || typeof raw !== "object") return null;
  const top = raw as Record<string, unknown>;
  const direct = fromObject(top);
  if (direct) return direct;

  const data = top.data;
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) {
    if (data.length === 0) return null;
    const first = data[0];
    if (first && typeof first === "object") {
      const fr = first as Record<string, unknown>;
      const flat = fromObject(fr);
      if (flat) return flat;
      const attrs = fr.attributes;
      if (attrs && typeof attrs === "object") {
        return fromObject(attrs as Record<string, unknown>);
      }
    }
    return null;
  }
  if (typeof data === "object") {
    const d = data as Record<string, unknown>;
    const flat = fromObject(d);
    if (flat) return flat;
    const attrs = d.attributes;
    if (attrs && typeof attrs === "object") {
      return fromObject(attrs as Record<string, unknown>);
    }
  }
  return null;
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

    const media = pickStrapiMediaRecord(s.image);
    if (media) {
      const src = strapiMediaUrl(media.url);
      if (src) {
        image = {
          src,
          width: media.width ?? 1200,
          height: media.height ?? 800,
          alt:
            typeof media.alternativeText === "string" &&
            media.alternativeText.trim()
              ? media.alternativeText.trim()
              : heading || title || "配图",
        };
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
