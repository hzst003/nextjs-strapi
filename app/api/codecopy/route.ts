import { getStrapiURL } from "@/lib/strapi";

const DEFAULT_STRAPI_ORIGIN = "http://124.220.27.60:1337";

function strapiOrigin(): string {
  const fromEnv = getStrapiURL();
  if (fromEnv) return fromEnv;
  return DEFAULT_STRAPI_ORIGIN;
}

function strapiHeaders(): Headers {
  const headers = new Headers({ "Content-Type": "application/json" });
  const token = process.env.STRAPI_API_TOKEN;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

type StrapiBlock = {
  type: string;
  children: unknown[];
};

function textToCodeBlock(text: string): StrapiBlock {
  return {
    type: "code",
    children: [{ type: "text", text }],
  };
}

async function fetchCurrentCodeBlocks(): Promise<StrapiBlock[]> {
  const res = await fetch(`${strapiOrigin()}/api/codecopy`, {
    headers: strapiHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const payload = (await res.json()) as { data?: { code?: unknown } };
  const code = payload.data?.code;
  return Array.isArray(code) ? (code as StrapiBlock[]) : [];
}

async function putCodeBlocks(blocks: StrapiBlock[]): Promise<Response> {
  const res = await fetch(`${strapiOrigin()}/api/codecopy`, {
    method: "PUT",
    headers: strapiHeaders(),
    body: JSON.stringify({ data: { code: blocks } }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    return Response.json(
      { error: text.slice(0, 500) || `Strapi ${res.status}` },
      { status: res.status },
    );
  }

  return Response.json({ ok: true });
}

/** 追加一段代码到 code 字段 */
export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "无效的 JSON" }, { status: 400 });
  }

  const text =
    body && typeof body === "object" && "text" in body
      ? String((body as { text: unknown }).text).trim()
      : "";
  if (!text) {
    return Response.json({ error: "代码内容不能为空" }, { status: 400 });
  }

  try {
    const current = await fetchCurrentCodeBlocks();
    const blocks = [...current, textToCodeBlock(text)];
    return putCodeBlocks(blocks);
  } catch (e) {
    const message = e instanceof Error ? e.message : "请求失败";
    return Response.json({ error: message }, { status: 500 });
  }
}

/** 按索引删除一段 code */
export async function PATCH(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "无效的 JSON" }, { status: 400 });
  }

  const indexRaw =
    body && typeof body === "object" && "index" in body
      ? (body as { index: unknown }).index
      : NaN;
  const index =
    typeof indexRaw === "number" ? indexRaw : parseInt(String(indexRaw), 10);
  if (!Number.isInteger(index) || index < 0) {
    return Response.json({ error: "无效的 index" }, { status: 400 });
  }

  try {
    const current = await fetchCurrentCodeBlocks();
    if (index >= current.length) {
      return Response.json({ error: "索引超出范围" }, { status: 404 });
    }
    const blocks = current.filter((_, i) => i !== index);
    return putCodeBlocks(blocks);
  } catch (e) {
    const message = e instanceof Error ? e.message : "请求失败";
    return Response.json({ error: message }, { status: 500 });
  }
}

/** 清空 Strapi 单类型 codecopy 的 code 字段 */
export async function DELETE(): Promise<Response> {
  try {
    return putCodeBlocks([]);
  } catch (e) {
    const message = e instanceof Error ? e.message : "请求失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
