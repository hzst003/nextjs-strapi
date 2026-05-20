export function contentDispositionAttachment(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_");
  const star = encodeURIComponent(filename);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${star}`;
}
