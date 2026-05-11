import "server-only";

import { getStrapiURL, strapiFetch } from "@/lib/strapi";

/** 列表：`GET /api/downloads?populate=file` */
export function strapiDownloadsListQuery(): string {
  const qs = new URLSearchParams();
  qs.set("populate", "file");
  qs.set("sort", "publishedAt:desc");
  return `api/downloads?${qs.toString()}`;
}

/** 单条：`GET /api/downloads/:documentId?populate=file` */
export function strapiDownloadByIdQuery(documentId: string): string {
  const qs = new URLSearchParams();
  qs.set("populate", "file");
  return `api/downloads/${encodeURIComponent(documentId)}?${qs.toString()}`;
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as Record<string, unknown>;
}

function pickFile(
  fields: Record<string, unknown>
): {
  url: string;
  name: string;
  mime: string;
  sizeKb?: number;
} | null {
  const fileRaw = fields.file;
  if (!fileRaw || typeof fileRaw !== "object") return null;
  const f = fileRaw as Record<string, unknown>;
  const url = typeof f.url === "string" ? f.url.trim() : "";
  const name = typeof f.name === "string" ? f.name.trim() : "";
  const mime =
    typeof f.mime === "string" && f.mime.trim()
      ? f.mime.trim()
      : "application/octet-stream";
  const sizeKb = typeof f.size === "number" ? f.size : undefined;
  if (!url) return null;
  return { url, name: name || "download", mime, sizeKb };
}

function formatSizeKb(sizeKb: unknown): string {
  if (typeof sizeKb !== "number" || !Number.isFinite(sizeKb)) return "";
  if (sizeKb >= 1024) return `约 ${(sizeKb / 1024).toFixed(1)} MB`;
  if (sizeKb >= 100) return `约 ${Math.round(sizeKb)} KB`;
  return `约 ${sizeKb.toFixed(2)} KB`;
}

export type StrapiDownloadListItem = {
  id: number;
  /** Strapi 5 REST：`GET /api/downloads/:documentId` */
  fetchKey: string;
  title: string;
  description: string;
  updatedAt: string;
  downloadFileName: string;
  mime: string;
  sizeLabel: string;
};

export type StrapiDownloadResolvedFile = {
  downloadFileName: string;
  mime: string;
  /** 服务端用于拉取字节流的绝对 URL */
  fetchUrl: string;
};

export function parseDownloadsListPayload(
  payload: unknown
): StrapiDownloadListItem[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];

  const out: StrapiDownloadListItem[] = [];
  for (const raw of data) {
    const fields = asRecord(raw);
    if (!fields) continue;

    const documentId =
      typeof fields.documentId === "string" ? fields.documentId.trim() : "";
    if (!documentId) continue;

    const title = typeof fields.title === "string" ? fields.title.trim() : "";
    if (!title) continue;

    const idRaw = fields.id;
    const numericId =
      typeof idRaw === "number"
        ? idRaw
        : typeof idRaw === "string"
          ? Number(idRaw)
          : NaN;
    if (!Number.isFinite(numericId)) continue;

    const file = pickFile(fields);
    if (!file) continue;

    const description =
      typeof fields.description === "string" ? fields.description.trim() : "";
    const updatedAt =
      typeof fields.updatedAt === "string" ? fields.updatedAt : "";

    const sizeLabel = formatSizeKb(file.sizeKb);

    const displayName = file.name || title;
    out.push({
      id: numericId,
      fetchKey: documentId,
      title,
      description,
      updatedAt: updatedAt.slice(0, 10),
      downloadFileName: displayName,
      mime: file.mime,
      sizeLabel,
    });
  }
  return out;
}

export async function fetchStrapiDownloadsList(): Promise<
  StrapiDownloadListItem[]
> {
  if (!getStrapiURL()) return [];
  try {
    const payload = await strapiFetch<unknown>(strapiDownloadsListQuery(), {
      cache: "no-store",
    });
    return parseDownloadsListPayload(payload);
  } catch {
    return [];
  }
}

/** 媒体若为绝对 URL 且路径含 `/uploads/`，改用 `STRAPI_URL` 作为源站（避免存成 localhost） */
function resolveServerFetchUrl(fileUrl: string): string | null {
  const base = getStrapiURL();
  if (!base) return null;
  try {
    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      const u = new URL(fileUrl);
      if (u.pathname.includes("/uploads/")) {
        return `${base}${u.pathname}${u.search}`;
      }
      return fileUrl;
    }
    const path = fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`;
    return `${base}${path}`;
  } catch {
    return null;
  }
}

function parseDownloadDetailPayload(
  payload: unknown
): StrapiDownloadResolvedFile | null {
  if (!payload || typeof payload !== "object") return null;
  const data = (payload as { data?: unknown }).data;
  const fields = asRecord(data);
  if (!fields) return null;
  const file = pickFile(fields);
  if (!file) return null;

  const fetchUrl = resolveServerFetchUrl(file.url);
  if (!fetchUrl) return null;

  return {
    downloadFileName: file.name || "download",
    mime: file.mime,
    fetchUrl,
  };
}

export async function fetchStrapiDownloadFile(
  documentId: string
): Promise<StrapiDownloadResolvedFile | null> {
  if (!getStrapiURL()) return null;
  try {
    const payload = await strapiFetch<unknown>(
      strapiDownloadByIdQuery(documentId),
      {
        cache: "no-store",
      },
    );
    return parseDownloadDetailPayload(payload);
  } catch {
    return null;
  }
}
