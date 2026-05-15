"use client";

import Link from "next/link";

import type { GlobalPageTopNav } from "@/lib/strapi";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

function StrapiTopNavInner({ nav }: { nav: GlobalPageTopNav }) {
  const { logo, links: strapiLinks, cta } = nav;

  function hrefIsExternal(href: string, isExternal: boolean) {
    return isExternal || /^https?:\/\//i.test(href);
  }

  return (
    <>
        {logo ? (
          hrefIsExternal(logo.href, /^https?:\/\//i.test(logo.href)) ? (
            <a
              href={logo.href || "#"}
              className="flex shrink-0 items-center gap-2 font-medium text-foreground underline-offset-4 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {logo.imageSrc ? (
                <img
                  src={logo.imageSrc}
                  alt={logo.imageAlt ?? ""}
                  width={logo.imageWidth ?? 32}
                  height={logo.imageHeight ?? 32}
                  className="h-7 w-auto max-w-[140px] object-contain"
                />
              ) : null}
              {logo.text ? <span>{logo.text}</span> : null}
            </a>
          ) : (
            <Link
              href={logo.href || "/"}
              className="flex shrink-0 items-center gap-2 font-medium text-foreground underline-offset-4 hover:underline"
            >
              {logo.imageSrc ? (
                <img
                  src={logo.imageSrc}
                  alt={logo.imageAlt ?? ""}
                  width={logo.imageWidth ?? 32}
                  height={logo.imageHeight ?? 32}
                  className="h-7 w-auto max-w-[140px] object-contain"
                />
              ) : null}
              {logo.text ? <span>{logo.text}</span> : null}
            </Link>
          )
        ) : null}
        {strapiLinks.length > 0 ? (
          <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
            {strapiLinks.map((item, i) => (
              <li key={`${item.url}-${i}`}>
                {hrefIsExternal(item.url, item.isExternal) ? (
                  <a
                    href={item.url}
                    className="hover:text-foreground"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.text}
                  </a>
                ) : (
                  <Link href={item.url} className="hover:text-foreground">
                    {item.text}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        ) : null}
        {cta ? (
          <span className="ml-auto shrink-0">
            {hrefIsExternal(cta.url, cta.isExternal) ? (
              <a
                href={cta.url}
                className="inline-flex rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground hover:opacity-90"
                target="_blank"
                rel="noopener noreferrer"
              >
                {cta.text}
              </a>
            ) : (
              <Link
                href={cta.url}
                className="inline-flex rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground hover:opacity-90"
              >
                {cta.text}
              </Link>
            )}
          </span>
        ) : null}
    </>
  );
}

function hasStrapiTopNavContent(nav: GlobalPageTopNav | null | undefined) {
  if (!nav) return false;
  return Boolean(nav.logo || nav.links.length > 0 || nav.cta);
}

export function SiteNav({
  strapiTopNav = null,
}: {
  strapiTopNav?: GlobalPageTopNav | null;
}) {
  const showStrapi = hasStrapiTopNavContent(strapiTopNav);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 md:px-6">
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 text-sm",
            !showStrapi && "min-h-0",
          )}
          aria-label={showStrapi ? "Strapi 顶栏" : undefined}
        >
          {showStrapi && strapiTopNav ? (
            <StrapiTopNavInner nav={strapiTopNav} />
          ) : null}
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
