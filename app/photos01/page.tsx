import type { Metadata } from "next";

import { PHOTOS01_ALBUM_PHOTOS } from "@/lib/photos01-images";

import { PhotoAlbumGallery } from "./photo-album-gallery";

export const metadata: Metadata = {
  title: "照片墙",
  description: "使用 react-photo-album 的响应式照片展示",
};

export default function Photos01Page() {
  return (
    <main className="flex flex-1 flex-col bg-background">
      <div className="mx-auto w-full max-w-6xl px-6 py-12 md:py-16">
        <header className="mb-10 max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            照片展示
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
            基于{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              react-photo-album
            </code>
            ，支持行、列与瀑布流布局，并随视口宽度自适应排版。图片来自{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              public/images/random-download
            </code>
            （可运行{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              npm run random-images
            </code>{" "}
            重新下载）。
          </p>
        </header>

        <PhotoAlbumGallery photos={PHOTOS01_ALBUM_PHOTOS} />
      </div>
    </main>
  );
}
