import type { Metadata } from "next";

import { loadStrapiGlobal } from "@/lib/strapi-global";

export async function generateMetadata(): Promise<Metadata> {
  const row = await loadStrapiGlobal();
  if (!row) {
    return { title: "首页", description: "欢迎访问" };
  }
  const title = row.title.trim() || "首页";
  const description =
    row.description.trim().slice(0, 160) || "欢迎访问";
  return { title, description };
}

export default function Home() {
  return <main className="flex min-h-0 flex-1 flex-col" />;
}
