import "server-only";

import type { Photo } from "react-photo-album";

import {
  getStrapiApiToken,
  getStrapiURL,
  strapiFetch,
  strapiMediaUrl,
} from "@/lib/strapi";

const DEFAULT_STRAPI_ORIGIN = "http://124.220.27.60:1337";

function strapiOrigin(): string {
  return getStrapiURL() || DEFAULT_STRAPI_ORIGIN;
}

/** 列表（含全部图片）：`GET /api/photos01s?populate=photosname` */
export function strapiPhotos01sListQuery(): string {
  const qs = new URLSearchParams();
  qs.set("populate", "photosname");
  qs.set("sort", "publishedAt:desc");
  return `api/photos01s?${qs.toString()}`;
}

/** 单条：`GET /api/photos01s/:documentId?populate=photosname` */
export function strapiPhotos01ByIdQuery(documentId: string): string {
  const qs = new URLSearchParams();
  qs.set("populate", "photosname");
  return `api/photos01s/${encodeURIComponent(documentId)}?${qs.toString()}`;
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as Record<string, unknown>;
}

export type Photos01ListItem = {
  documentId: string;
  updatedAt: string;
};

function parseListItem(raw: unknown): Photos01ListItem | null {
  const fields = asRecord(raw);
  if (!fields) return null;

  const documentId =
    typeof fields.documentId === "string" ? fields.documentId.trim() : "";
  if (!documentId) return null;

  const updatedAt =
    typeof fields.updatedAt === "string" ? fields.updatedAt.slice(0, 10) : "";

  return { documentId, updatedAt };
}

export function parsePhotos01sListPayload(
  payload: unknown,
): Photos01ListItem[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];

  const out: Photos01ListItem[] = [];
  for (const raw of data) {
    const item = parseListItem(raw);
    if (item) out.push(item);
  }
  return out;
}

/** 从列表接口合并所有条目的 photosname */
export function parsePhotos01sAllPhotosPayload(payload: unknown): Photo[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];

  const out: Photo[] = [];
  const seenSrc = new Set<string>();

  for (const raw of data) {
    const fields = asRecord(raw);
    if (!fields) continue;

    for (const photo of parsePhotosname(fields)) {
      if (seenSrc.has(photo.src)) continue;
      seenSrc.add(photo.src);
      out.push(photo);
    }
  }
  return out;
}

function parsePhotosname(fields: Record<string, unknown>): Photo[] {
  const raw = fields.photosname;
  if (!Array.isArray(raw)) return [];

  const out: Photo[] = [];
  for (const item of raw) {
    const f = asRecord(item);
    if (!f) continue;

    const url = typeof f.url === "string" ? f.url.trim() : "";
    const src = strapiMediaUrl(url);
    if (!src) continue;

    const widthRaw = f.width;
    const heightRaw = f.height;
    const width =
      typeof widthRaw === "number" && widthRaw > 0
        ? widthRaw
        : typeof widthRaw === "string"
          ? Number(widthRaw)
          : NaN;
    const height =
      typeof heightRaw === "number" && heightRaw > 0
        ? heightRaw
        : typeof heightRaw === "string"
          ? Number(heightRaw)
          : NaN;
    if (!Number.isFinite(width) || !Number.isFinite(height)) continue;

    const name = typeof f.name === "string" ? f.name.trim() : "";
    const altText =
      typeof f.alternativeText === "string" ? f.alternativeText.trim() : "";
    const caption = typeof f.caption === "string" ? f.caption.trim() : "";
    const label = altText || name || `照片 ${out.length + 1}`;

    out.push({
      src,
      width,
      height,
      alt: label,
      title: caption || name || label,
    });
  }
  return out;
}

export function parsePhotos01AlbumPayload(payload: unknown): Photo[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown }).data;
  const fields = asRecord(data);
  if (!fields) return [];
  return parsePhotosname(fields);
}

async function loadPhotos01sPayload(): Promise<unknown> {
  const path = strapiPhotos01sListQuery();

  if (getStrapiURL()) {
    try {
      return await strapiFetch<unknown>(path, { cache: "no-store" });
    } catch {
      /* 回退到直连 */
    }
  }

  try {
    const payload = await fetchJson(path, Boolean(getStrapiApiToken()));
    if (parsePhotos01sListPayload(payload).length > 0) return payload;
  } catch {
    /* 带 Token 失败时尝试匿名 */
  }

  return fetchJson(path, false);
}

async function fetchJson(path: string, withToken: boolean): Promise<unknown> {
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

export async function fetchPhotos01sList(): Promise<Photos01ListItem[]> {
  try {
    const payload = await loadPhotos01sPayload();
    return parsePhotos01sListPayload(payload);
  } catch {
    return [];
  }
}

export async function fetchPhotos01AllPhotos(): Promise<Photo[]> {
  try {
    const payload = await loadPhotos01sPayload();
    return parsePhotos01sAllPhotosPayload(payload);
  } catch {
    return [];
  }
}

export async function fetchPhotos01sBundle(): Promise<{
  entries: Photos01ListItem[];
  allPhotos: Photo[];
}> {
  try {
    const payload = await loadPhotos01sPayload();
    return {
      entries: parsePhotos01sListPayload(payload),
      allPhotos: parsePhotos01sAllPhotosPayload(payload),
    };
  } catch {
    return { entries: [], allPhotos: [] };
  }
}

export async function fetchPhotos01Album(documentId: string): Promise<Photo[]> {
  const id = documentId.trim();
  if (!id) return [];

  if (getStrapiURL()) {
    try {
      const payload = await strapiFetch<unknown>(strapiPhotos01ByIdQuery(id), {
        cache: "no-store",
      });
      const photos = parsePhotos01AlbumPayload(payload);
      if (photos.length > 0) return photos;
    } catch {
      /* 回退到直连 */
    }
  }

  const path = strapiPhotos01ByIdQuery(id);

  const load = async (withToken: boolean) => {
    const payload = await fetchJson(path, withToken);
    return parsePhotos01AlbumPayload(payload);
  };

  try {
    const photos = await load(Boolean(getStrapiApiToken()));
    if (photos.length > 0) return photos;
  } catch {
    /* fallback */
  }

  try {
    return await load(false);
  } catch {
    return [];
  }
}
