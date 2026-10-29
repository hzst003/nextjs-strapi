"use client";

import { useState } from "react";
import { ArrowDownToLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DOWNLOAD_CHUNK_BYTES } from "@/lib/download-headers";

function fileSizeFrom(res: Response): number | null {
  const fromHeader = Number(res.headers.get("x-file-size"));
  if (Number.isSafeInteger(fromHeader) && fromHeader > 0) return fromHeader;
  const match = res.headers.get("content-range")?.match(/\/(\d+)\s*$/);
  if (match) {
    const total = Number(match[1]);
    if (Number.isSafeInteger(total) && total > 0) return total;
  }
  if (res.status === 200) {
    const len = Number(res.headers.get("content-length"));
    if (Number.isSafeInteger(len) && len > 0) return len;
  }
  return null;
}

export function DownloadFileButton({
  href,
  fileName,
  mime,
}: {
  href: string;
  fileName: string;
  mime: string;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const busy = progress !== null;

  async function onClick() {
    if (busy) return;
    setError(false);
    setProgress(0);
    try {
      const probe = await fetch(href, { headers: { Range: "bytes=0-0" } });
      if (probe.status !== 206 && probe.status !== 200) {
        throw new Error(String(probe.status));
      }
      const total = fileSizeFrom(probe);
      await probe.arrayBuffer();
      if (!total) throw new Error("size");

      const parts: ArrayBuffer[] = [];
      let offset = 0;
      while (offset < total) {
        const end = Math.min(offset + DOWNLOAD_CHUNK_BYTES, total) - 1;
        const res = await fetch(href, {
          headers: { Range: `bytes=${offset}-${end}` },
        });
        if (res.status !== 206 && res.status !== 200) {
          throw new Error(String(res.status));
        }
        const buf = await res.arrayBuffer();
        const expected = end - offset + 1;
        if (buf.byteLength !== expected) throw new Error("short");
        parts.push(buf);
        offset += buf.byteLength;
        setProgress(Math.min(99, Math.round((offset / total) * 100)));
      }

      const blob = new Blob(parts, {
        type: mime || "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setProgress(null);
    } catch {
      setError(true);
      setProgress(null);
    }
  }

  const label =
    progress === null ? "下载" : progress > 0 ? `下载中 ${progress}%` : "下载中";

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={busy}
        onClick={() => void onClick()}
      >
        <ArrowDownToLine className="size-4" aria-hidden />
        {label}
      </Button>
      {error ? <p className="text-xs text-destructive">下载失败，请重试</p> : null}
    </div>
  );
}
