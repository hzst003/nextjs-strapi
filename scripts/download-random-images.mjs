/**
 * 随机下载 10 张图片，每张体积 < 150KB。
 * 使用 picsum.photos 小尺寸 JPEG，下载后校验字节数。
 *
 * 用法：npm run random-images
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outDir = path.join(projectRoot, "public", "images", "random-download");

const TARGET = 10;
const MAX_BYTES = 150 * 1024;
/** 较小尺寸更容易落在 150KB 内 */
const W = 520;
const H = 390;
const MAX_ATTEMPTS = 80;

function randomId() {
  return 1 + Math.floor(Math.random() * 999);
}

async function tryDownload(id) {
  const url = `https://picsum.photos/id/${id}/${W}/${H}.jpg`;
  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES || buf.length < 512) return null;
  const sig = buf.subarray(0, 2).toString("hex");
  if (sig !== "ffd8") return null;
  return buf;
}

await fs.mkdir(outDir, { recursive: true });

const saved = [];
const usedIds = new Set();
let attempts = 0;

while (saved.length < TARGET && attempts < MAX_ATTEMPTS) {
  attempts += 1;
  let id = randomId();
  while (usedIds.has(id)) id = randomId();
  usedIds.add(id);
  try {
    const buf = await tryDownload(id);
    if (!buf) continue;
    const name = `pic-${String(saved.length + 1).padStart(2, "0")}-id${id}.jpg`;
    const dest = path.join(outDir, name);
    await fs.writeFile(dest, buf);
    saved.push({ name, id, bytes: buf.length });
  } catch {
    // 网络偶发失败，重试下一轮
  }
}

if (saved.length < TARGET) {
  console.error(
    `仅成功 ${saved.length}/${TARGET} 张（已尝试 ${attempts} 次）。可调大 MAX_ATTEMPTS 或缩小 W/H。`,
  );
  process.exitCode = 1;
}

console.log(`输出目录: ${path.relative(projectRoot, outDir)}`);
for (const row of saved) {
  console.log(`  ${row.name}  id=${row.id}  ${row.bytes} bytes (${(row.bytes / 1024).toFixed(1)} KB)`);
}
