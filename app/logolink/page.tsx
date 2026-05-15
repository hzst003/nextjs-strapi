import type { Metadata } from "next";
import Image from "next/image";

import randomLogos from "@/lib/random-logos.json";

export const metadata: Metadata = {
  title: "图标链接",
  description: "十个带图标的常用链接入口（随机 Simple Icons）",
};

type RandomLogoRow = (typeof randomLogos)[number];

const LINKS: RandomLogoRow[] = randomLogos;

export default function LogoLinkPage() {
  return (
    <main className="flex flex-1 flex-col">
      <div className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
          <p className="text-sm font-medium text-muted-foreground">快捷入口</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            图标链接
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">
            共 {LINKS.length} 个条目，Logo 为本地 SVG（Simple Icons 随机集）。重新执行{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              npm run random-logos
            </code>{" "}
            可换一批。点击在新标签页打开。
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:py-12">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LINKS.map(({ href, title, description, logoSrc, slug }) => (
            <li key={slug}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/30 hover:bg-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted/80 p-2 ring-1 ring-border transition-colors group-hover:bg-muted">
                  <Image
                    src={logoSrc}
                    alt=""
                    width={28}
                    height={28}
                    className="size-7 object-contain"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 font-medium text-foreground group-hover:text-primary">
                    {title}
                    <span className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                      ↗
                    </span>
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {description}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
