import type { Metadata } from "next";
import { Upload } from "lucide-react";

import { getStrapiApiToken, getStrapiURL } from "@/lib/strapi";
import { fetchWasuupdownloadsList } from "@/lib/strapi-wasuupdownloads";

import { WasuupdownloadFileList } from "./wasuupdownload-file-list";
import { WasuupdownloadUpload } from "./wasuupdownload-upload";

const DEFAULT_STRAPI_ORIGIN = "http://124.220.27.60:1337";

export const metadata: Metadata = {
  title: "Wasu 上传",
  description: "向 Strapi wasuupdownloads 条目上传文件",
};

function strapiOrigin(): string {
  return getStrapiURL() || DEFAULT_STRAPI_ORIGIN;
}

type PageProps = {
  searchParams: Promise<{ id?: string }>;
};

export default async function WasuupdownloadPage({ searchParams }: PageProps) {
  const { id: idParam } = await searchParams;
  const entries = await fetchWasuupdownloadsList();

  const active =
    (idParam
      ? entries.find((e) => e.documentId === idParam)
      : null) ?? entries[0] ?? null;

  const uploadReady = Boolean(getStrapiApiToken());

  if (!getStrapiURL() && entries.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-24">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            未配置 Strapi 地址
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            请在{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              .env.local
            </code>{" "}
            中设置{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              STRAPI_URL
            </code>
            （例如{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              http://124.220.27.60:1337
            </code>
            ）。
          </p>
        </div>
      </main>
    );
  }

  if (!active) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-24">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            暂无条目
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Strapi 中尚无{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              wasuupdownloads
            </code>{" "}
            记录，或接口不可用。若后台已有数据，请检查{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              STRAPI_API_TOKEN
            </code>{" "}
            是否写错（勿写成{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              STRAPI_API_TOKEN=STRAPI_API_TOKEN=...
            </code>
            ），并确认 Public 角色已开放 find。
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <div className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            文件上传
          </h1>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-10 sm:py-12">
        <WasuupdownloadUpload
          documentId={active.documentId}
          uploadReady={uploadReady}
        />

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 border-b border-border pb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Upload className="size-4" aria-hidden />
            已有文件（{active.files.length}）
          </h2>
          <WasuupdownloadFileList
            documentId={active.documentId}
            files={active.files}
            deleteReady={uploadReady}
          />
        </section>

        {entries.length > 1 ? (
          <p className="text-xs text-muted-foreground">
            切换条目：在地址栏加{" "}
            <code className="rounded bg-muted px-1 font-mono">?id=文档ID</code>
          </p>
        ) : null}
      </div>
    </main>
  );
}
