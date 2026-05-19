import type { Metadata } from "next";
import { cache } from "react";

import { getStrapiURL, strapiFetch } from "@/lib/strapi";

import { CodecopyBlockList } from "./codecopy-block-list";
import { CodecopyToolbar } from "./codecopy-toolbar";

const DEFAULT_STRAPI_ORIGIN = "http://124.220.27.60:1337";

function strapiOrigin(): string {
  const fromEnv = getStrapiURL();
  if (fromEnv) return fromEnv;
  return DEFAULT_STRAPI_ORIGIN;
}

type CodecopyPayload = {
  data?: {
    code?: unknown;
  } | null;
};

function extractCodeBlocks(data: unknown): unknown[] {
  if (!data || typeof data !== "object") return [];
  const code = (data as Record<string, unknown>).code;
  if (Array.isArray(code)) return code;
  if (typeof code === "string" && code.trim()) {
    return [
      {
        type: "code",
        children: [{ type: "text", text: code.trim() }],
      },
    ];
  }
  return [];
}

const loadCodecopyPayload = cache(async (): Promise<CodecopyPayload | null> => {
  const path = "api/codecopy";
  try {
    if (getStrapiURL()) {
      return await strapiFetch<CodecopyPayload>(path, { cache: "no-store" });
    }
    const res = await fetch(`${strapiOrigin()}/${path}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as CodecopyPayload;
  } catch {
    return null;
  }
});

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Code Copy",
    description: "来自 Strapi 单类型 codecopy 的 code 字段",
  };
}

export default async function CodecopyPage() {
  const payload = await loadCodecopyPayload();
  const data = payload?.data ?? null;
  const blocks = extractCodeBlocks(data);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Code Copy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            内容来自{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {strapiOrigin()}/api/codecopy
            </code>
          </p>
        </div>
        {data ? <CodecopyToolbar /> : null}
      </header>

      {!data ? (
        <p className="text-muted-foreground">无法加载数据，请检查 Strapi 接口。</p>
      ) : blocks.length > 0 ? (
        <CodecopyBlockList blocks={blocks} />
      ) : (
        <p className="text-muted-foreground">code 字段为空。</p>
      )}
    </main>
  );
}
