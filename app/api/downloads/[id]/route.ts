import { getStrapiURL } from "@/lib/strapi";
import { fetchStrapiDownloadFile } from "@/lib/strapi-downloads";

export const runtime = "nodejs";

function contentDispositionAttachment(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_");
  const star = encodeURIComponent(filename);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${star}`;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!getStrapiURL()) {
    return new Response("STRAPI_URL is not set", { status: 500 });
  }

  const { id: rawId } = await ctx.params;
  const id = decodeURIComponent(rawId).trim();
  if (!id || id === "." || id === "..") {
    return new Response("Bad Request", { status: 400 });
  }

  try {
    const resolved = await fetchStrapiDownloadFile(id);
    if (!resolved) {
      return new Response("Not Found", { status: 404 });
    }

    const headers = new Headers();
    const token = process.env.STRAPI_API_TOKEN;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const upstream = await fetch(resolved.fetchUrl, {
      headers,
      cache: "no-store",
    });

    if (!upstream.ok) {
      return new Response(null, {
        status: upstream.status === 404 ? 404 : 502,
      });
    }

    const contentType =
      upstream.headers.get("Content-Type")?.split(";")[0]?.trim() ||
      resolved.mime;

    const outHeaders = new Headers({
      "Content-Type": contentType,
      "Content-Disposition": contentDispositionAttachment(
        resolved.downloadFileName,
      ),
      "Cache-Control": "private, no-store",
    });
    const len = upstream.headers.get("Content-Length");
    if (len) outHeaders.set("Content-Length", len);

    if (upstream.body) {
      return new Response(upstream.body, { headers: outHeaders });
    }

    const body = await upstream.arrayBuffer();
    return new Response(body, { headers: outHeaders });
  } catch {
    return new Response("Internal Server Error", { status: 500 });
  }
}
