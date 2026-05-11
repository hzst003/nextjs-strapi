import type { Metadata } from "next";
import { ArrowDownToLine, FileArchive, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStrapiURL } from "@/lib/strapi";
import { fetchStrapiDownloadsList } from "@/lib/strapi-downloads";

export const metadata: Metadata = {
  title: "文件下载",
  description: "文档与资源下载中心",
};

function FileKindIcon({ name }: { name: string }) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".zip") || lower.includes("zip")) {
    return (
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <FileArchive className="size-5" aria-hidden />
      </span>
    );
  }
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
      <FileText className="size-5" aria-hidden />
    </span>
  );
}

export default async function DownloadPage() {
  const baseConfigured = Boolean(getStrapiURL());
  const items = baseConfigured ? await fetchStrapiDownloadsList() : [];

  if (!baseConfigured) {
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
            ），用于请求{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              /api/downloads
            </code>
            。修改后请重启开发服务器。
          </p>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-24">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            暂无下载条目
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Strapi 中尚无带附件的{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              downloads
            </code>
            记录，或接口不可用。请确认 Public 角色已开放{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              find
            </code>
            ，且条目已发布并包含{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              file
            </code>
            。
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <div className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
          <p className="text-sm font-medium text-muted-foreground">资源中心</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            文件下载
          </h1>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:py-12">
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="border-b border-border pb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            全部文件
          </h2>
          <ul className="mt-4 flex flex-col gap-4">
            {items.map((item) => (
              <li
                key={item.fetchKey}
                className="flex gap-4 rounded-lg border border-border bg-background/60 p-4"
              >
                <FileKindIcon name={item.downloadFileName} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{item.title}</p>
                      {item.description ? (
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {item.description}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {[item.sizeLabel, item.updatedAt ? `更新 ${item.updatedAt}` : ""]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5">
                      <a
                        href={`/api/downloads/${encodeURIComponent(item.fetchKey)}`}
                        download={item.downloadFileName}
                      >
                        <ArrowDownToLine className="size-4" aria-hidden />
                        下载
                      </a>
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
