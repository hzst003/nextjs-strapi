import type { Metadata } from "next";
import { cache } from "react";
import {
  getStrapiURL,
  parseLinkPagePayload,
  strapiFetch,
  strapiLinkPagesApiQuery,
  type LinkPageContent,
} from "@/lib/strapi";

const loadLinkPage = cache(async (): Promise<LinkPageContent | null> => {
  if (!getStrapiURL()) return null;
  try {
    const payload = await strapiFetch<unknown>(strapiLinkPagesApiQuery(), {
      cache: "no-store",
    });
    return parseLinkPagePayload(payload);
  } catch {
    return null;
  }
});

export async function generateMetadata(): Promise<Metadata> {
  const c = await loadLinkPage();
  if (!c) {
    return { title: "网址导航", description: "常用网站快捷入口" };
  }
  const title = c.heading.trim() || "网址导航";
  const desc = c.lead.trim().slice(0, 160) || "常用网站快捷入口";
  return { title, description: desc };
}

export default async function LinkPage() {
  const content = await loadLinkPage();

  if (!content) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-24">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            暂时无法加载导航内容
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            请确认已配置{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              STRAPI_URL
            </code>
            ，且 Strapi 中{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              link-pages
            </code>{" "}
            已有发布条目（含有效{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              jsoncontent
            </code>
            ）。
          </p>
        </div>
      </main>
    );
  }

  const subtitle = content.subtitle.trim() || "快捷导航";
  const heading = content.heading.trim() || "网址导航";
  const lead =
    content.lead.trim() ||
    "以下为导航分组，数据来自 Strapi 集合 link-pages（字段 jsoncontent）。";

  return (
    <main className="flex flex-1 flex-col">
      <div className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
          <p className="text-sm font-medium text-muted-foreground">{subtitle}</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {heading}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">{lead}</p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-2">
          {content.sections.map((section) => (
            <section
              key={section.title}
              className="rounded-xl border border-border bg-card p-6 shadow-sm"
            >
              <h2 className="border-b border-border pb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </h2>
              <ul className="mt-4 flex flex-col gap-2">
                {section.links.map((link) => (
                  <li key={`${section.title}-${link.url}`}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col rounded-lg border border-transparent px-3 py-2.5 transition-colors hover:border-border hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <span className="font-medium text-foreground group-hover:text-primary">
                        {link.title}
                        <span className="ml-1 inline text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                          ↗
                        </span>
                      </span>
                      {link.description ? (
                        <span className="mt-0.5 text-sm text-muted-foreground">
                          {link.description}
                        </span>
                      ) : null}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
