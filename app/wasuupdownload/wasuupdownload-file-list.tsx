"use client";

import { FileText, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { WasuupdownloadFileItem } from "@/lib/strapi-wasuupdownloads";

type Props = {
  documentId: string;
  files: WasuupdownloadFileItem[];
  deleteReady?: boolean;
};

export function WasuupdownloadFileList({
  documentId,
  files,
  deleteReady = true,
}: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(file: WasuupdownloadFileItem) {
    if (!window.confirm(`确定删除「${file.name}」？此操作不可恢复。`)) {
      return;
    }

    setDeletingId(file.id);
    setError(null);

    try {
      const url = `/api/wasuupdownloads/${encodeURIComponent(documentId)}?fileId=${file.id}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        let message = `删除失败 (${res.status})`;
        try {
          const payload = (await res.json()) as { error?: string };
          if (payload.error) message = payload.error;
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeletingId(null);
    }
  }

  if (files.length === 0) {
    return <p className="mt-4 text-sm text-muted-foreground">尚无附件。</p>;
  }

  return (
    <>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <ul className="mt-4 flex flex-col gap-3">
        {files.map((file) => (
          <li
            key={file.id}
            className="flex gap-3 rounded-lg border border-border bg-background/60 p-4"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <FileText className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{file.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {[file.sizeLabel, file.mime].filter(Boolean).join(" · ")}
              </p>
              <a
                href={`/api/wasuupdownloads/files/${file.id}`}
                download={file.name}
                className="mt-2 inline-block text-sm text-primary underline-offset-4 hover:underline"
              >
                下载
              </a>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={!deleteReady || deletingId !== null}
              onClick={() => handleDelete(file)}
              className="shrink-0 self-center"
            >
              <Trash2 className="size-3.5" aria-hidden />
              {deletingId === file.id ? "删除中…" : "删除"}
            </Button>
          </li>
        ))}
      </ul>
    </>
  );
}
