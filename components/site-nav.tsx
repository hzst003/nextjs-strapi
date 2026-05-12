"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "首页" },
  { href: "/blog", label: "博客" },
  { href: "/linkpage", label: "网址导航" },
  { href: "/download", label: "下载" },
] as const;

function linkActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <nav
        aria-label="主导航"
        className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-1 gap-y-2 px-4 py-3 md:px-6"
      >
        <Link
          href="/"
          className="mr-2 font-semibold tracking-tight text-foreground"
        >
          XL
        </Link>
        <span
          aria-hidden
          className="hidden h-4 w-px shrink-0 bg-border sm:block"
        />
        <ul className="flex flex-wrap items-center gap-1 sm:gap-2">
          {links.map(({ href, label }) => {
            const active = linkActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
