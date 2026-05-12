import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ArticleBlocks } from "@/components/article-blocks";
import { getStrapiURL } from "@/lib/strapi";
import {
  fetchStrapiArticleBySlug,
  type BlogPostDetail,
} from "@/lib/strapi-blog";

const loadPost = cache(
  async (slug: string): Promise<BlogPostDetail | null> => {
    if (!getStrapiURL()) return null;
    return fetchStrapiArticleBySlug(slug);
  }
);

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const post = await loadPost(slug);
  if (!post) {
    return { title: "文章未找到" };
  }
  const desc =
    post.excerpt.trim().slice(0, 160) ||
    `${post.title} · 博客`;
  return {
    title: post.title,
    description: desc,
    openGraph: {
      title: post.title,
      description: desc,
      type: "article",
      publishedTime: post.publishedAt || undefined,
    },
  };
}

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      dateStyle: "long",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function looksLikeHtml(s: string): boolean {
  return /<[a-z][\s\S]*>/i.test(s);
}

export default async function BlogArticlePage(props: PageProps) {
  const { slug } = await props.params;
  const decoded = decodeURIComponent(slug);

  if (!getStrapiURL()) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            未配置 Strapi
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            无法加载文章。请设置{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              STRAPI_URL
            </code>{" "}
            后重试。
          </p>
          <Link
            href="/blog"
            className="mt-6 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            返回博客
          </Link>
        </div>
      </main>
    );
  }

  const post = await loadPost(decoded);
  if (!post) {
    notFound();
  }

  const hasBlocks = Boolean(post.blocks && post.blocks.length > 0);
  const htmlOrText = post.contentHtmlOrText;
  const hasRichText = Boolean(htmlOrText);

  return (
    <main className="flex flex-1 flex-col bg-background pb-16">
      <article className="mx-auto w-full max-w-3xl px-4 pt-10 sm:pt-14">
        <Link
          href="/blog"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          ← 返回列表
        </Link>

        {post.publishedAt ? (
          <time
            dateTime={post.publishedAt}
            className="mt-6 block text-sm text-muted-foreground"
          >
            {formatDate(post.publishedAt)}
          </time>
        ) : null}

        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
          {post.title}
        </h1>

        {post.excerpt ? (
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>
        ) : null}

        {post.coverSrc ? (
          <figure className="mt-10 overflow-hidden rounded-xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.coverSrc}
              alt={post.coverAlt}
              className="max-h-[min(520px,70vh)] w-full object-cover"
            />
          </figure>
        ) : null}

        <div className="mt-10 border-t border-border pt-10">
          {hasBlocks ? (
            <ArticleBlocks blocks={post.blocks!} />
          ) : hasRichText && htmlOrText ? (
            looksLikeHtml(htmlOrText) ? (
              <div
                className="article-html max-w-none text-base leading-relaxed text-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:decoration-primary/30 [&_a]:underline-offset-4 [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/25 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm [&_h1]:mb-4 [&_h1]:mt-10 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mb-2 [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold [&_h4]:mb-2 [&_h4]:mt-6 [&_h4]:text-lg [&_h4]:font-semibold [&_img]:my-6 [&_img]:max-h-[min(520px,70vh)] [&_img]:w-full [&_img]:rounded-lg [&_img]:border [&_img]:border-border [&_img]:object-contain [&_li]:my-1 [&_ol]:my-4 [&_ol]:ml-6 [&_ol]:list-decimal [&_p]:mb-4 [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted/50 [&_pre]:p-4 [&_pre]:text-sm [&_ul]:my-4 [&_ul]:ml-6 [&_ul]:list-disc"
                dangerouslySetInnerHTML={{ __html: htmlOrText }}
              />
            ) : (
              <div className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                {htmlOrText}
              </div>
            )
          ) : (
            <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
              该条目暂无正文字段（可在 Strapi 中为文章填写{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">
                blocks
              </code>{" "}
              或{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">
                content
              </code>
              ）。
            </p>
          )}
        </div>
      </article>
    </main>
  );
}
