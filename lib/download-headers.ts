/** EdgeOne Pages 云函数响应体上限为 6MB，单次拉取必须低于该值。 */
export const DOWNLOAD_CHUNK_BYTES = 4 * 1024 * 1024;

export function contentDispositionAttachment(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_");
  const star = encodeURIComponent(filename);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${star}`;
}

/** 只接受 `bytes=start-end`，并把跨度限制在单块大小以内。 */
export function clampDownloadRange(header: string): string | null {
  const match = /^bytes=(\d+)-(\d+)$/.exec(header.trim());
  if (!match) return null;
  const start = Number(match[1]);
  let end = Number(match[2]);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end < start) {
    return null;
  }
  const maxEnd = start + DOWNLOAD_CHUNK_BYTES - 1;
  if (end > maxEnd) end = maxEnd;
  return `bytes=${start}-${end}`;
}
