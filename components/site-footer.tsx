import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-background/95">
      <div className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-muted-foreground md:px-6">
        <p className="text-foreground/90">
          © 2026 Xu.（AI 建站）保留所有权利.
        </p>
        <div className="mt-3 flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-4 sm:gap-y-1">
          <Link
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            浙ICP备2025157769号
          </Link>
          <Link
            href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=33010502012241"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            浙公网安备33010502012241号
          </Link>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground/90">
          AI 生成内容，持续更新中
        </p>
      </div>
    </footer>
  );
}
