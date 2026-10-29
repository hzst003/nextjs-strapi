import "server-only";

import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import { Readable } from "node:stream";

import { contentDispositionAttachment } from "@/lib/download-headers";

const MAX_REDIRECTS = 5;

function singleHeader(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

function parseContentRange(
  value: string | undefined,
): { start: number; end: number; total: number } | null {
  if (!value) return null;
  const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(value.trim());
  if (!match) return null;
  return {
    start: Number(match[1]),
    end: Number(match[2]),
    total: Number(match[3]),
  };
}

/**
 * 开发模式下 Next 会改写全局 fetch，并把响应用 tee 进 HMR 缓存。
 * 大文件会在两路读取之间卡住，dev proxy 空闲约 30 秒后断开，浏览器下载失败。
 * 二进制下载改走 node:http(s)，按原始字节流式转发。
 */
function requestOnce(
  url: string,
  headers: Record<string, string>,
): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqFn = parsed.protocol === "https:" ? httpsRequest : httpRequest;
    const req = reqFn(url, { method: "GET", headers }, (res) => resolve(res));
    req.on("error", reject);
    req.end();
  });
}

async function openUpstream(
  startUrl: string,
  headers: Record<string, string>,
): Promise<IncomingMessage> {
  let current = startUrl;
  let hdrs = headers;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await requestOnce(current, hdrs);
    const status = res.statusCode ?? 0;
    const location = singleHeader(res.headers.location);
    if (location && status >= 300 && status < 400 && hop < MAX_REDIRECTS) {
      res.resume();
      const next = new URL(location, current).href;
      if (new URL(next).origin !== new URL(current).origin) {
        hdrs = { ...hdrs };
        delete hdrs.Authorization;
        delete hdrs.authorization;
      }
      current = next;
      continue;
    }
    return res;
  }

  throw new Error("Too many redirects");
}

export async function proxyAttachmentResponse(options: {
  fetchUrl: string;
  downloadFileName: string;
  mime: string;
  token?: string;
  range?: string;
}): Promise<Response> {
  const reqHeaders: Record<string, string> = {
    Accept: "*/*",
    "Accept-Encoding": "identity",
  };
  if (options.token) reqHeaders.Authorization = `Bearer ${options.token}`;
  if (options.range) reqHeaders.Range = options.range;

  const upstream = await openUpstream(options.fetchUrl, reqHeaders);
  const status = upstream.statusCode ?? 502;
  if (status !== 200 && status !== 206) {
    upstream.resume();
    return new Response(null, {
      status: status === 404 ? 404 : 502,
    });
  }

  const contentType =
    singleHeader(upstream.headers["content-type"])?.split(";")[0]?.trim() ||
    options.mime;

  const outHeaders = new Headers({
    "Content-Type": contentType,
    "Content-Disposition": contentDispositionAttachment(options.downloadFileName),
    "Cache-Control": "private, no-store",
    "Accept-Ranges": "bytes",
  });

  const len = singleHeader(upstream.headers["content-length"]);
  const contentRange = parseContentRange(
    singleHeader(upstream.headers["content-range"]),
  );
  if (contentRange) {
    outHeaders.set("X-File-Size", String(contentRange.total));
    const span = contentRange.end - contentRange.start + 1;
    const consistent =
      contentRange.end < contentRange.total &&
      (!len || Number(len) === span);
    if (consistent) {
      outHeaders.set(
        "Content-Range",
        `bytes ${contentRange.start}-${contentRange.end}/${contentRange.total}`,
      );
      if (len) outHeaders.set("Content-Length", len);
    }
  } else if (len && status === 200) {
    outHeaders.set("Content-Length", len);
    outHeaders.set("X-File-Size", len);
  }

  return new Response(Readable.toWeb(upstream) as unknown as ReadableStream, {
    status,
    headers: outHeaders,
  });
}
