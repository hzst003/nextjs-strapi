"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

function blockToText(block: unknown): string {
  if (!block || typeof block !== "object") return "";
  const kids = (block as Record<string, unknown>).children;
  if (!Array.isArray(kids)) return "";
  return kids
    .map((child) => {
      if (!child || typeof child !== "object") return "";
      const c = child as Record<string, unknown>;
      if (c.type === "text") return String(c.text ?? "");
      return "";
    })
    .join("");
}

type CodecopyBlockListProps = {
  blocks: unknown[];
};

export function CodecopyBlockList({ blocks }: CodecopyBlockListProps) {
  const router = useRouter();
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(index: number) {
    if (!confirm("确定要删除这段代码吗？")) return;

    setDeletingIndex(index);
    setError(null);
    try {
      const res = await fetch("/api/codecopy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index }),
      });
      if (!res.ok) {
        let message = `删除失败 (${res.status})`;
        try {
          const body = (await res.json()) as { error?: string };
          if (body.error) message = body.error;
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    } finally {
      setDeletingIndex(null);
    }
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        const text = blockToText(block);
        const isCode =
          block &&
          typeof block === "object" &&
          (block as Record<string, unknown>).type === "code";

        return (
          <div
            key={index}
            className="overflow-hidden rounded-lg border border-border bg-muted/20"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
              <span className="text-xs text-muted-foreground">
                #{index + 1}
                {isCode ? " · 代码块" : ""}
              </span>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={deletingIndex !== null}
                onClick={() => handleDelete(index)}
              >
                {deletingIndex === index ? "删除中…" : "删除"}
              </Button>
            </div>
            <pre className="overflow-x-auto p-4 text-sm">
              <code className="font-mono whitespace-pre-wrap text-foreground">
                {text || "（空内容）"}
              </code>
            </pre>
          </div>
        );
      })}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
