import { getStrapiApiToken, getStrapiURL } from "@/lib/strapi";
import { fetchStrapiDownloadFile } from "@/lib/strapi-downloads";
import { proxyAttachmentResponse } from "@/lib/proxy-file-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    return await proxyAttachmentResponse({
      fetchUrl: resolved.fetchUrl,
      downloadFileName: resolved.downloadFileName,
      mime: resolved.mime,
      token: getStrapiApiToken(),
    });
  } catch {
    return new Response("Internal Server Error", { status: 500 });
  }
}
