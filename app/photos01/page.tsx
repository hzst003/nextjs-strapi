import type { Metadata } from "next";

import {
  fetchPhotos01Album,
  fetchPhotos01sBundle,
} from "@/lib/strapi-photos01";
import { getStrapiURL } from "@/lib/strapi";

import { PhotoAlbumGallery } from "./photo-album-gallery";

export const metadata: Metadata = {
  title: "照片墙",
  description:
    "使用 react-photo-album 展示 Strapi photos01s 全部图片，点击可灯箱预览",
};

type PageProps = {
  searchParams: Promise<{ id?: string }>;
};

export default async function Photos01Page({ searchParams }: PageProps) {
  const { id: idParam } = await searchParams;
  const { entries, allPhotos } = await fetchPhotos01sBundle();

  const filterId = idParam?.trim() || null;
  const photos = filterId
    ? await fetchPhotos01Album(filterId)
    : allPhotos;

  return (
    <main className="flex flex-1 flex-col bg-background">
      <div className="mx-auto w-full max-w-6xl px-6 py-12 md:py-16">
        {!getStrapiURL() && entries.length === 0 && photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            未配置{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              STRAPI_URL
            </code>
            ，且无法从默认 Strapi 拉取数据。请在{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              .env.local
            </code>{" "}
            中设置后重启开发服务器。
          </p>
        ) : null}

        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            暂无 photos01s 条目，请在 Strapi 后台创建并发布。
          </p>
        ) : photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {filterId ? (
              <>
                条目{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {filterId}
                </code>{" "}
                未包含可展示的图片，或当前 id 无效。
              </>
            ) : (
              <>暂无已发布的图片（photosname 为空）。</>
            )}
          </p>
        ) : (
          <PhotoAlbumGallery photos={photos} />
        )}
      </div>
    </main>
  );
}
