import { clampDownloadRange } from "@/lib/download-headers";
import { proxyAttachmentResponse } from "@/lib/proxy-file-stream";
import { getStrapiApiToken, getStrapiURL } from "@/lib/strapi";
import { fetchStrapiDownloadFile } from "@/lib/strapi-downloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
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

  const rawRange = req.headers.get("range");
  let range: string | undefined;
  if (rawRange) {
    const clamped = clampDownloadRange(rawRange);
    if (!clamped) {
      return new Response("Range Not Satisfiable", { status: 416 });
    }
    range = clamped;
  }

  try {
    const resolved = await fetchStrapiDownloadFile(id);
    if (!resolved) {
      return new Response("Not Found", { status: 404 });
    }

    return await proxyAttachmentResponse({
      fetchUrl: resolved.fetchUrl,
      downloadFileName: resolved.downloadFileName,
      mime: resolved.mime,
      token: getStrapiApiToken(),
      range,
    });
  } catch {
    return new Response("Internal Server Error", { status: 500 });
  }
}
