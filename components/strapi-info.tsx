import { getStrapiURL } from "@/lib/strapi";

export async function StrapiInfo() {
  const base = getStrapiURL();
  if (!base) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        未设置 STRAPI_URL，请复制 .env.example 为 .env.local 并填写。
      </p>
    );
  }

  let reachable = false;
  let statusText = "";
  try {
    const res = await fetch(`${base}/admin`, { cache: "no-store" });
    reachable = res.ok;
    statusText = String(res.status);
  } catch (e) {
    statusText = e instanceof Error ? e.message : "请求失败";
  }

  return (
    <section className="mt-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-left dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Strapi 后端
      </h2>
      <dl className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
        <div>
          <dt className="inline font-medium text-zinc-700 dark:text-zinc-300">
            API 根地址{" "}
          </dt>
          <dd className="inline break-all font-mono text-xs">{base}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-zinc-700 dark:text-zinc-300">
            管理后台探测{" "}
          </dt>
          <dd className="inline">
            {reachable ? "可访问" : "不可访问"}
            {statusText ? `（${statusText}）` : null}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
        前端请求封装见 <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">lib/strapi.ts</code>
        ；Token 仅放在服务端环境变量，勿提交到 Git。
      </p>
    </section>
  );
}
