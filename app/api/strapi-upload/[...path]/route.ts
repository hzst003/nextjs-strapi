import { getStrapiURL } from "@/lib/strapi";

export const runtime = "nodejs";

/**
 * 将浏览器请求代理到 Strapi `GET /uploads/...`（服务端可用 HTTP），
 * 页面仍为 HTTPS 同源地址，避免混合内容。
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path?: string[] }> },
): Promise<Response> {
  const { path: segments } = await ctx.params;
  if (!segments?.length) {
    return new Response("Not Found", { status: 404 });
  }
  if (segments.some((s) => s === "" || s === "." || s === ".." || s.includes("\\"))) {
    return new Response("Bad Request", { status: 400 });
  }

  const base = getStrapiURL();
  if (!base) {
    return new Response("STRAPI_URL is not set", { status: 500 });
  }

  const uploadPath = segments.map(decodeURIComponent).join("/");
  const upstream = `${base}/uploads/${uploadPath}`;

  const upstreamRes = await fetch(upstream, {
    cache: "force-cache",
    next: { revalidate: 3600 },
  });

  if (!upstreamRes.ok) {
    return new Response(null, { status: upstreamRes.status });
  }

  const contentType =
    upstreamRes.headers.get("Content-Type") ?? "application/octet-stream";
  const body = upstreamRes.arrayBuffer();

  return new Response(await body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
