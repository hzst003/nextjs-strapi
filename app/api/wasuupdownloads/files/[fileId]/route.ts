import { getStrapiApiToken, getStrapiURL } from "@/lib/strapi";
import { proxyAttachmentResponse } from "@/lib/proxy-file-stream";
import { fetchStrapiUploadFileById } from "@/lib/strapi-wasuupdownloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ fileId: string }> },
): Promise<Response> {
  if (!getStrapiURL()) {
    return new Response("STRAPI_URL is not set", { status: 500 });
  }

  const { fileId: rawId } = await ctx.params;
  const fileId = Number(decodeURIComponent(rawId).trim());
  if (!Number.isFinite(fileId)) {
    return new Response("Bad Request", { status: 400 });
  }

  try {
    const resolved = await fetchStrapiUploadFileById(fileId);
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
