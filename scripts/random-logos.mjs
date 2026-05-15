/**
 * 从已安装的 simple-icons 包中随机选取 10 个图标：
 * - 复制 SVG 到 public/logos/random/
 * - 写入 lib/random-logos.json 供 /logolink 页面使用
 *
 * 用法：npm run random-logos
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getIconsData, getIconSlug } from "simple-icons/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const siRoot = path.join(projectRoot, "node_modules", "simple-icons");
const outDir = path.join(projectRoot, "public", "logos", "random");
const manifestPath = path.join(projectRoot, "lib", "random-logos.json");

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function hrefFor(icon, slug) {
  const s = icon.source;
  if (typeof s === "string" && s.startsWith("https://")) return s;
  if (typeof s === "string" && s.startsWith("http://"))
    return `https://${s.slice("http://".length)}`;
  return `https://simpleicons.org/icons/${slug}`;
}

const icons = await getIconsData(siRoot);
const picked = shuffle(icons).slice(0, 10);

await fs.mkdir(outDir, { recursive: true });

const manifest = [];
for (const icon of picked) {
  const slug = getIconSlug(icon);
  const src = path.join(siRoot, "icons", `${slug}.svg`);
  const dest = path.join(outDir, `${slug}.svg`);
  await fs.copyFile(src, dest);
  manifest.push({
    slug,
    title: icon.title,
    description: "Simple Icons 随机条目",
    href: hrefFor(icon, slug),
    logoSrc: `/logos/random/${slug}.svg`,
  });
}

await fs.mkdir(path.dirname(manifestPath), { recursive: true });
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(`Wrote ${manifest.length} icons -> ${path.relative(projectRoot, outDir)}`);
console.log(`Manifest -> ${path.relative(projectRoot, manifestPath)}`);
for (const row of manifest) {
  console.log(`  - ${row.slug} (${row.title})`);
}
