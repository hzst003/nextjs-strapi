import "server-only";

import {
  getStrapiURL,
  pickStrapiMediaRecord,
  strapiFetch,
  strapiMediaUrl,
} from "@/lib/strapi";

/**
 * Strapi 集合 `article` → REST `api/articles`（需在 Public 角色开放 find / findOne）。
 * 建议字段：title、slug（UID）、excerpt（可选）、publishedAt；
 * 正文可为长文本 `content`（HTML 或纯文本）或 Blocks 字段 `blocks`（与 Strapi 默认 Blocks JSON 结构兼容）。
 */
export function strapiArticlesListQuery(): string {
  const qs = new URLSearchParams();
  qs.set("sort", "publishedAt:desc");
  qs.set("pagination[pageSize]", "50");
  qs.set("populate[coverImage]", "true");
  return `api/articles?${qs.toString()}`;
}

export function strapiArticleBySlugQuery(slug: string): string {
  const qs = new URLSearchParams();
  qs.set("filters[slug][$eq]", slug);
  qs.set("populate[coverImage]", "true");
  return `api/articles?${qs.toString()}`;
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as Record<string, unknown>;
}

export type BlogPostSummary = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  coverSrc: string | null;
  coverAlt: string;
};

export type BlogPostDetail = BlogPostSummary & {
  /** 原始 HTML 或纯文本（无 blocks 时使用） */
  contentHtmlOrText: string | null;
  /** Strapi Blocks JSON；与 contentHtmlOrText 二选一 */
  blocks: unknown[] | null;
};

function pickCover(fields: Record<string, unknown>): {
  src: string | null;
  alt: string;
} {
  const media = pickStrapiMediaRecord(fields.coverImage);
  if (!media) return { src: null, alt: "" };
  const src = strapiMediaUrl(media.url);
  const alt =
    typeof media.alternativeText === "string" && media.alternativeText.trim()
      ? media.alternativeText.trim()
      : "";
  return { src, alt };
}

function parsePublishedAt(fields: Record<string, unknown>): string {
  const p = fields.publishedAt;
  return typeof p === "string" ? p : "";
}

function excerptFromFields(
  fields: Record<string, unknown>,
  title: string
): string {
  const ex =
    typeof fields.excerpt === "string"
      ? fields.excerpt.trim()
      : typeof fields.description === "string"
        ? fields.description.trim()
        : "";
  if (ex) return ex;
  const content = fields.content;
  if (typeof content === "string" && content.trim()) {
    const plain = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return plain.length > 160 ? `${plain.slice(0, 157)}…` : plain;
  }
  return title ? `阅读全文：${title}` : "";
}

export function parseArticlesListPayload(payload: unknown): BlogPostSummary[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];

  const out: BlogPostSummary[] = [];
  for (const raw of data) {
    const fields = asRecord(raw);
    if (!fields) continue;
    const slug = typeof fields.slug === "string" ? fields.slug.trim() : "";
    const title = typeof fields.title === "string" ? fields.title.trim() : "";
    if (!slug || !title) continue;
    const publishedAt = parsePublishedAt(fields);
    const { src, alt } = pickCover(fields);
    out.push({
      slug,
      title,
      excerpt: excerptFromFields(fields, title),
      publishedAt,
      coverSrc: src,
      coverAlt: alt || title,
    });
  }
  return out;
}

export function parseArticleDetailPayload(
  payload: unknown
): BlogPostDetail | null {
  if (!payload || typeof payload !== "object") return null;
  const data = (payload as { data?: unknown }).data;
  let fields: Record<string, unknown> | null = null;
  if (Array.isArray(data)) {
    fields = data.length > 0 ? asRecord(data[0]) : null;
  } else {
    fields = asRecord(data);
  }
  if (!fields) return null;

  const slug = typeof fields.slug === "string" ? fields.slug.trim() : "";
  const title = typeof fields.title === "string" ? fields.title.trim() : "";
  if (!slug || !title) return null;

  const publishedAt = parsePublishedAt(fields);
  const { src, alt } = pickCover(fields);

  const contentRaw = fields.content;
  const contentHtmlOrText =
    typeof contentRaw === "string" && contentRaw.trim()
      ? contentRaw.trim()
      : null;

  const blocksRaw = fields.blocks;
  const blocks = Array.isArray(blocksRaw) ? blocksRaw : null;

  return {
    slug,
    title,
    excerpt: excerptFromFields(fields, title),
    publishedAt,
    coverSrc: src,
    coverAlt: alt || title,
    contentHtmlOrText,
    blocks,
  };
}

export async function fetchStrapiArticlesList(): Promise<BlogPostSummary[]> {
  if (!getStrapiURL()) return [];
  try {
    const payload = await strapiFetch<unknown>(strapiArticlesListQuery(), {
      cache: "no-store",
    });
    return parseArticlesListPayload(payload);
  } catch {
    return [];
  }
}

export async function fetchStrapiArticleBySlug(
  slug: string
): Promise<BlogPostDetail | null> {
  if (!getStrapiURL() || !slug.trim()) return null;
  try {
    const payload = await strapiFetch<unknown>(
      strapiArticleBySlugQuery(slug.trim()),
      {
        cache: "no-store",
      }
    );
    return parseArticleDetailPayload(payload);
  } catch {
    return null;
  }
}
