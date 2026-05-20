import "server-only";

import {
  getStrapiApiToken,
  getStrapiURL,
  strapiMediaUrl,
} from "@/lib/strapi";

const DEFAULT_STRAPI_ORIGIN = "http://124.220.27.60:1337";

function strapiOrigin(): string {
  return getStrapiURL() || DEFAULT_STRAPI_ORIGIN;
}

export function strapiWasuupdownloadsListQuery(): string {
  const qs = new URLSearchParams();
  qs.set("populate", "files");
  qs.set("sort", "publishedAt:desc");
  return `api/wasuupdownloads?${qs.toString()}`;
}

export function strapiWasuupdownloadByIdQuery(documentId: string): string {
  const qs = new URLSearchParams();
  qs.set("populate", "files");
  return `api/wasuupdownloads/${encodeURIComponent(documentId)}?${qs.toString()}`;
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as Record<string, unknown>;
}

function formatSizeKb(sizeKb: unknown): string {
  if (typeof sizeKb !== "number" || !Number.isFinite(sizeKb)) return "";
  if (sizeKb >= 1024) return `约 ${(sizeKb / 1024).toFixed(1)} MB`;
  if (sizeKb >= 100) return `约 ${Math.round(sizeKb)} KB`;
  return `约 ${sizeKb.toFixed(2)} KB`;
}

export type WasuupdownloadFileItem = {
  id: number;
  name: string;
  mime: string;
  sizeLabel: string;
  href: string | null;
};

export type WasuupdownloadEntry = {
  documentId: string;
  updatedAt: string;
  files: WasuupdownloadFileItem[];
};

function parseFiles(fields: Record<string, unknown>): WasuupdownloadFileItem[] {
  const raw = fields.files;
  if (!Array.isArray(raw)) return [];

  const out: WasuupdownloadFileItem[] = [];
  for (const item of raw) {
    const f = asRecord(item);
    if (!f) continue;
    const idRaw = f.id;
    const id =
      typeof idRaw === "number"
        ? idRaw
        : typeof idRaw === "string"
          ? Number(idRaw)
          : NaN;
    if (!Number.isFinite(id)) continue;

    const name = typeof f.name === "string" ? f.name.trim() : "";
    const url = typeof f.url === "string" ? f.url.trim() : "";
    const mime =
      typeof f.mime === "string" && f.mime.trim()
        ? f.mime.trim()
        : "application/octet-stream";

    out.push({
      id,
      name: name || `file-${id}`,
      mime,
      sizeLabel: formatSizeKb(f.size),
      href: strapiMediaUrl(url),
    });
  }
  return out;
}

function parseEntry(raw: unknown): WasuupdownloadEntry | null {
  const fields = asRecord(raw);
  if (!fields) return null;

  const documentId =
    typeof fields.documentId === "string" ? fields.documentId.trim() : "";
  if (!documentId) return null;

  const updatedAt =
    typeof fields.updatedAt === "string" ? fields.updatedAt.slice(0, 10) : "";

  return {
    documentId,
    updatedAt,
    files: parseFiles(fields),
  };
}

export function parseWasuupdownloadsListPayload(
  payload: unknown,
): WasuupdownloadEntry[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];

  const out: WasuupdownloadEntry[] = [];
  for (const raw of data) {
    const entry = parseEntry(raw);
    if (entry) out.push(entry);
  }
  return out;
}

async function fetchWasuupdownloadsPayload(
  withToken: boolean,
): Promise<unknown> {
  const path = strapiWasuupdownloadsListQuery();
  const headers = new Headers({ Accept: "application/json" });
  const token = getStrapiApiToken();
  if (withToken && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${strapiOrigin()}/${path}`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Strapi ${res.status}`);
  }
  return res.json();
}

export async function fetchWasuupdownloadsList(): Promise<WasuupdownloadEntry[]> {
  try {
    const payload = await fetchWasuupdownloadsPayload(Boolean(getStrapiApiToken()));
    const parsed = parseWasuupdownloadsListPayload(payload);
    if (parsed.length > 0) return parsed;
  } catch {
    /* 带 Token 失败时尝试匿名（Public find） */
  }

  try {
    const payload = await fetchWasuupdownloadsPayload(false);
    return parseWasuupdownloadsListPayload(payload);
  } catch {
    return [];
  }
}

export async function fetchWasuupdownloadEntry(
  documentId: string,
): Promise<WasuupdownloadEntry | null> {
  const path = strapiWasuupdownloadByIdQuery(documentId);

  const load = async (withToken: boolean) => {
    const headers = new Headers({ Accept: "application/json" });
    const token = getStrapiApiToken();
    if (withToken && token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const res = await fetch(`${strapiOrigin()}/${path}`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Strapi ${res.status}`);
    const payload = (await res.json()) as { data?: unknown };
    return parseEntry(payload.data);
  };

  try {
    const entry = await load(Boolean(getStrapiApiToken()));
    if (entry) return entry;
  } catch {
    /* fallback */
  }

  try {
    return await load(false);
  } catch {
    return null;
  }
}

export type WasuupdownloadResolvedFile = {
  downloadFileName: string;
  mime: string;
  fetchUrl: string;
};

/** 媒体若为绝对 URL 且路径含 `/uploads/`，改用 `STRAPI_URL` 作为源站 */
function resolveServerFetchUrl(fileUrl: string): string | null {
  const base = getStrapiURL() || DEFAULT_STRAPI_ORIGIN;
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

export async function fetchStrapiUploadFileById(
  fileId: number,
): Promise<WasuupdownloadResolvedFile | null> {
  const headers = new Headers({ Accept: "application/json" });
  const token = getStrapiApiToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(
    `${strapiOrigin()}/api/upload/files/${fileId}`,
    { headers, cache: "no-store" },
  );
  if (!res.ok) return null;

  const json = (await res.json()) as Record<string, unknown>;
  const payload = asRecord(json.data) ?? json;
  const url = typeof payload.url === "string" ? payload.url.trim() : "";
  if (!url) return null;

  const fetchUrl = resolveServerFetchUrl(url);
  if (!fetchUrl) return null;

  const name =
    typeof payload.name === "string" && payload.name.trim()
      ? payload.name.trim()
      : `file-${fileId}`;
  const mime =
    typeof payload.mime === "string" && payload.mime.trim()
      ? payload.mime.trim()
      : "application/octet-stream";

  return { downloadFileName: name, mime, fetchUrl };
}

export function collectFileIds(fields: Record<string, unknown>): number[] {
  const raw = fields.files;
  if (!Array.isArray(raw)) return [];
  const ids: number[] = [];
  for (const item of raw) {
    const f = asRecord(item);
    if (!f) continue;
    const idRaw = f.id;
    const id =
      typeof idRaw === "number"
        ? idRaw
        : typeof idRaw === "string"
          ? Number(idRaw)
          : NaN;
    if (Number.isFinite(id)) ids.push(id);
  }
  return ids;
}
