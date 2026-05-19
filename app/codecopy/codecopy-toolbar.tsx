"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function CodecopyToolbar() {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [text, setText] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) {
      setError("请输入代码内容");
      return;
    }

    setAddLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/codecopy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      });
      if (!res.ok) {
        let message = `保存失败 (${res.status})`;
        try {
          const body = (await res.json()) as { error?: string };
          if (body.error) message = body.error;
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }
      setText("");
      setAddOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setAddLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-col items-end gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setError(null);
            setAddOpen(true);
          }}
        >
          添加代码
        </Button>
        {error && !addOpen ? (
          <p className="max-w-xs text-right text-xs text-destructive">{error}</p>
        ) : null}
      </div>

      {addOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onClick={() => {
            if (!addLoading) setAddOpen(false);
          }}
        >
          <form
            role="dialog"
            aria-labelledby="codecopy-add-title"
            className="w-full max-w-lg rounded-xl border border-border bg-background p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleAdd}
          >
            <h2
              id="codecopy-add-title"
              className="text-lg font-semibold text-foreground"
            >
              添加代码
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              将追加到现有内容末尾；保存后同步到 Strapi。
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="粘贴或输入代码…"
              rows={12}
              autoFocus
              disabled={addLoading}
              className="mt-4 w-full resize-y rounded-lg border border-border bg-muted/30 px-3 py-2 font-mono text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
            />
            {error && addOpen ? (
              <p className="mt-2 text-sm text-destructive">{error}</p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={addLoading}
                onClick={() => setAddOpen(false)}
              >
                取消
              </Button>
              <Button type="submit" size="sm" disabled={addLoading}>
                {addLoading ? "保存中…" : "保存"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
