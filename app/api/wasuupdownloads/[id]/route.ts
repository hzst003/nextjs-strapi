import { getStrapiApiToken, getStrapiURL } from "@/lib/strapi";
import {
  collectFileIds,
  strapiWasuupdownloadByIdQuery,
} from "@/lib/strapi-wasuupdownloads";

const DEFAULT_STRAPI_ORIGIN = "http://124.220.27.60:1337";

function strapiOrigin(): string {
  return getStrapiURL() || DEFAULT_STRAPI_ORIGIN;
}

function strapiAuthHeaders(): Headers {
  const headers = new Headers();
  const token = getStrapiApiToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

function uploadForbiddenMessage(): string {
  return [
    "Strapi 拒绝上传（403）。",
    "请在项目根目录 .env.local 中设置 STRAPI_API_TOKEN（Strapi 后台 → Settings → API Tokens 创建，类型选 Full access 或勾选 Upload + wasuupdownloads 的 update），保存后重启 npm run dev。",
    "或在 Strapi 后台为 Public 角色开启 Upload 插件的 upload 权限。",
  ].join(" ");
}

function strapiJsonHeaders(): Headers {
  const headers = strapiAuthHeaders();
  headers.set("Content-Type", "application/json");
  return headers;
}

async function fetchEntryFields(
  documentId: string,
): Promise<Record<string, unknown> | null> {
  const res = await fetch(
    `${strapiOrigin()}/${strapiWasuupdownloadByIdQuery(documentId)}`,
    {
      headers: strapiAuthHeaders(),
      cache: "no-store",
    },
  );
  if (!res.ok) return null;
  const payload = (await res.json()) as { data?: unknown };
  if (!payload.data || typeof payload.data !== "object") return null;
  return payload.data as Record<string, unknown>;
}

function parseUploadedIds(uploaded: unknown): number[] {
  const list = Array.isArray(uploaded) ? uploaded : [uploaded];
  const ids: number[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const idRaw = (item as { id?: unknown }).id;
    const id =
      typeof idRaw === "number"
        ? idRaw
        : typeof idRaw === "string"
          ? Number(idRaw)
          : NaN;
    if (Number.isFinite(id)) ids.push(id);
  }
  if (ids.length === 0) {
    throw new Error("上传响应缺少文件 id");
  }
  return ids;
}

async function uploadFilesToStrapi(files: File[]): Promise<number[]> {
  const body = new FormData();
  for (const file of files) {
    body.append("files", file);
  }

  const res = await fetch(`${strapiOrigin()}/api/upload`, {
    method: "POST",
    headers: strapiAuthHeaders(),
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 403) {
      throw new Error(uploadForbiddenMessage());
    }
    const text = await res.text();
    throw new Error(text.slice(0, 500) || `上传失败 (${res.status})`);
  }

  return parseUploadedIds(await res.json());
}

function collectUploadFiles(form: FormData): File[] {
  const fromPlural = form
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (fromPlural.length > 0) return fromPlural;

  return form
    .getAll("file")
    .filter((f): f is File => f instanceof File && f.size > 0);
}

async function updateEntryFiles(
  documentId: string,
  fileIds: number[],
): Promise<Response> {
  const res = await fetch(
    `${strapiOrigin()}/api/wasuupdownloads/${encodeURIComponent(documentId)}`,
    {
      method: "PUT",
      headers: strapiJsonHeaders(),
      body: JSON.stringify({ data: { files: fileIds } }),
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const text = await res.text();
    return Response.json(
      { error: text.slice(0, 500) || `更新失败 (${res.status})` },
      { status: res.status },
    );
  }

  return Response.json({ ok: true });
}

/** 上传一个或多个文件并追加到 wasuupdownloads 条目的 files 字段 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: documentId } = await ctx.params;
  if (!documentId?.trim()) {
    return Response.json({ error: "缺少条目 id" }, { status: 400 });
  }

  if (!getStrapiApiToken()) {
    return Response.json(
      {
        error:
          "未配置 STRAPI_API_TOKEN。请在 .env.local 填写 Strapi API Token 后重启开发服务器（后台：Settings → API Tokens）。",
      },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "无效的表单数据" }, { status: 400 });
  }

  const files = collectUploadFiles(form);
  if (files.length === 0) {
    return Response.json({ error: "请选择要上传的文件" }, { status: 400 });
  }

  try {
    const fields = await fetchEntryFields(documentId);
    if (!fields) {
      return Response.json({ error: "条目不存在或无法读取" }, { status: 404 });
    }

    const newIds = await uploadFilesToStrapi(files);
    const existing = collectFileIds(fields);
    const merged = [...existing];
    for (const id of newIds) {
      if (!merged.includes(id)) merged.push(id);
    }

    const res = await updateEntryFiles(documentId, merged);
    if (!res.ok) return res;

    return Response.json({ ok: true, count: newIds.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "上传失败";
    return Response.json({ error: message }, { status: 500 });
  }
}

async function deleteStrapiUploadFile(fileId: number): Promise<void> {
  const res = await fetch(
    `${strapiOrigin()}/api/upload/files/${fileId}`,
    {
      method: "DELETE",
      headers: strapiAuthHeaders(),
      cache: "no-store",
    },
  );
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(text.slice(0, 500) || `删除媒体文件失败 (${res.status})`);
  }
}

/** 从条目中移除指定附件，并删除 Strapi 媒体库中的文件 */
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: documentId } = await ctx.params;
  if (!documentId?.trim()) {
    return Response.json({ error: "缺少条目 id" }, { status: 400 });
  }

  if (!getStrapiApiToken()) {
    return Response.json(
      {
        error:
          "未配置 STRAPI_API_TOKEN。请在 .env.local 填写 Strapi API Token 后重启开发服务器。",
      },
      { status: 503 },
    );
  }

  const fileIdRaw = new URL(req.url).searchParams.get("fileId");
  const fileId = fileIdRaw ? Number(fileIdRaw) : NaN;
  if (!Number.isFinite(fileId)) {
    return Response.json({ error: "缺少或无效的文件 id" }, { status: 400 });
  }

  try {
    const fields = await fetchEntryFields(documentId);
    if (!fields) {
      return Response.json({ error: "条目不存在或无法读取" }, { status: 404 });
    }

    const existing = collectFileIds(fields);
    if (!existing.includes(fileId)) {
      return Response.json({ error: "该文件不在当前条目中" }, { status: 404 });
    }

    const remaining = existing.filter((id) => id !== fileId);
    const res = await updateEntryFiles(documentId, remaining);
    if (!res.ok) return res;

    await deleteStrapiUploadFile(fileId);

    return Response.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "删除失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
