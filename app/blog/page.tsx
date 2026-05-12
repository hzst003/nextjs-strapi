import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { getStrapiURL } from "@/lib/strapi";
import { fetchStrapiArticlesList } from "@/lib/strapi-blog";

const loadPosts = cache(fetchStrapiArticlesList);

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "博客",
    description: "",
  };
}

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      dateStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export default async function BlogIndexPage() {
  const baseOk = Boolean(getStrapiURL());
  const posts = baseOk ? await loadPosts() : [];

  if (!baseOk) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-24">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            未配置 Strapi
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
            ，并确保 Strapi 中已创建并发布集合类型{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              article
            </code>{" "}
            （REST 路径{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              /api/articles
            </code>
            ），Public 角色已开放{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              find
            </code>
            。
          </p>
        </div>
      </main>
    );
  }

  if (posts.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-24">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            暂无文章
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            已成功连接 Strapi，但未拉取到任何{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              articles
            </code>{" "}
            条目。请在后台发布至少一篇文章（需填写标题并处于已发布状态）。
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col bg-background">
      <div className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
          <p className="text-sm font-medium text-muted-foreground">Journal</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            博客
          </h1>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:py-12">
        <ul className="flex flex-col gap-6">
          {posts.map((post) => (
            <li key={post.slug}>
              <article className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
                <Link
                  href={`/blog/${encodeURIComponent(post.slug)}`}
                  className="flex flex-col sm:flex-row"
                >
                  {post.coverSrc ? (
                    <div className="relative aspect-[16/10] w-full shrink-0 sm:aspect-auto sm:h-44 sm:w-64">
                      {/* 封面多为 Strapi 外链，与首页一致用原生 img 更稳 */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.coverSrc}
                        alt={post.coverAlt}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    </div>
                  ) : null}
                  <div className="flex flex-1 flex-col justify-center p-6 sm:p-8">
                    {post.publishedAt ? (
                      <time
                        dateTime={post.publishedAt}
                        className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                      >
                        {formatDate(post.publishedAt)}
                      </time>
                    ) : null}
                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground group-hover:text-primary">
                      {post.title}
                    </h2>
                    {post.excerpt ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {post.excerpt}
                      </p>
                    ) : null}
                    <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">
                      阅读全文
                      <span className="ml-1 transition-transform group-hover:translate-x-0.5">
                        →
                      </span>
                    </span>
                  </div>
                </Link>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
