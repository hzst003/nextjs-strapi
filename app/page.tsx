import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cache } from "react";
import { Button } from "@/components/ui/button";
import {
  parseHomePayload,
  strapiFetch,
  strapiHomeApiQuery,
} from "@/lib/strapi";
import { cn } from "@/lib/utils";

const loadHomePayload = cache(async (): Promise<unknown | null> => {
  try {
    return await strapiFetch<unknown>(strapiHomeApiQuery(), {
      cache: "no-store",
    });
  } catch {
    return null;
  }
});

export async function generateMetadata(): Promise<Metadata> {
  const payload = await loadHomePayload();
  const c = parseHomePayload(payload);
  return {
    title: c?.title?.trim() ? c.title : "首页",
    description: c?.description?.trim()
      ? c.description.slice(0, 160)
      : undefined,
  };
}

export default async function Home() {
  const payload = await loadHomePayload();
  const content = parseHomePayload(payload);

  if (!content) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-24">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            暂时无法加载页面内容
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            请确认已配置 <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">STRAPI_URL</code>
            ，且 Strapi 中已发布{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">home</code>{" "}
            数据。
          </p>
        </div>
      </main>
    );
  }

  const { title, description, heading, subheading, image, link } = content;
  const displayHeading = heading.trim() || title.trim() || "欢迎";
  const displayLead =
    subheading.trim() || description.trim() || "";
  const onPhoto = Boolean(image);

  return (
    <>
      {image ? (
        <>
          <div className="fixed inset-0 z-0">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority
              unoptimized
              className="object-cover"
              sizes="100vw"
            />
          </div>
          <div
            aria-hidden
            className="fixed inset-0 z-[1] bg-gradient-to-t from-black/85 via-black/45 to-black/25"
          />
        </>
      ) : (
        <div
          aria-hidden
          className="fixed inset-0 z-0 bg-gradient-to-br from-muted via-background to-muted"
        />
      )}

      <main
        className={cn(
          "relative z-10 flex min-h-[100dvh] w-full flex-1 flex-col px-6 pb-10 pt-16 md:px-10 md:pb-14 md:pt-20",
        )}
      >
        <div className="flex flex-1 flex-col justify-end md:justify-center">
          <div className="mx-auto w-full max-w-3xl">
            {title.trim() ? (
              <p
                className={cn(
                  "text-xs font-semibold uppercase tracking-[0.2em]",
                  onPhoto ? "text-white/75" : "text-muted-foreground",
                )}
              >
                {title.trim()}
              </p>
            ) : null}

            <h1
              className={cn(
                "mt-4 font-[family-name:var(--font-heading)] text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]",
                onPhoto ? "text-white drop-shadow-md" : "text-foreground",
              )}
            >
              {displayHeading}
            </h1>

            {displayLead ? (
              <p
                className={cn(
                  "mt-6 max-w-xl text-lg leading-relaxed text-pretty sm:text-xl",
                  onPhoto ? "text-white/90" : "text-muted-foreground",
                )}
              >
                {displayLead}
              </p>
            ) : null}

            {description.trim() && subheading.trim() ? (
              <p
                className={cn(
                  "mt-6 max-w-xl text-base leading-relaxed text-pretty",
                  onPhoto ? "text-white/80" : "text-muted-foreground/90",
                )}
              >
                {description.trim()}
              </p>
            ) : null}

            {link ? (
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className={cn(
                    "rounded-full px-8",
                    onPhoto &&
                      "border-0 bg-white text-zinc-900 shadow-lg hover:bg-white/90",
                  )}
                >
                  <Link
                    href={link.url}
                    {...(link.isExternal
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {link.text}
                  </Link>
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        <footer
          className={cn(
            "mt-auto pt-12 text-center text-xs",
            onPhoto ? "text-white/55" : "text-muted-foreground",
          )}
        >
          内容由 Strapi CMS 驱动 · {title.trim() || displayHeading}
        </footer>
      </main>
    </>
  );
}
