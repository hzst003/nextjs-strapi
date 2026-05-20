"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  documentId: string;
  uploadReady?: boolean;
};

export function WasuupdownloadUpload({
  documentId,
  uploadReady = true,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = inputRef.current;
    const fileList = input?.files;
    if (!fileList || fileList.length === 0) {
      setError("请选择至少一个文件");
      setSuccess(null);
      return;
    }

    const files = Array.from(fileList);

    setLoading(true);
    setError(null);
    setSuccess(null);

    const body = new FormData();
    for (const file of files) {
      body.append("files", file);
    }

    try {
      const res = await fetch(
        `/api/wasuupdownloads/${encodeURIComponent(documentId)}`,
        { method: "POST", body },
      );
      if (!res.ok) {
        let message = `上传失败 (${res.status})`;
        try {
          const payload = (await res.json()) as { error?: string };
          if (payload.error) message = payload.error;
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }

      let count = files.length;
      try {
        const payload = (await res.json()) as { count?: number };
        if (typeof payload.count === "number") count = payload.count;
      } catch {
        /* ignore */
      }

      if (input) input.value = "";
      setSelectedCount(0);
      setSuccess(
        count === 1
          ? `已上传：${files[0].name}`
          : `已成功上传 ${count} 个文件`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-card p-6 shadow-sm"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        上传文件
      </h2>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">选择文件（可多选）</span>
          <input
            ref={inputRef}
            type="file"
            multiple
            disabled={loading || !uploadReady}
            onChange={(e) => setSelectedCount(e.target.files?.length ?? 0)}
            className="block w-full cursor-pointer text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted/80 disabled:opacity-50"
          />
          {selectedCount > 0 ? (
            <span className="text-xs text-muted-foreground">
              已选 {selectedCount} 个文件
            </span>
          ) : null}
        </label>
        <Button
          type="submit"
          disabled={loading || !uploadReady}
          className="shrink-0 sm:mb-0.5"
        >
          {loading ? "上传中…" : selectedCount > 1 ? `上传 ${selectedCount} 个` : "上传"}
        </Button>
      </div>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      {success ? (
        <p className="mt-3 text-sm text-muted-foreground">{success}</p>
      ) : null}
    </form>
  );
}
