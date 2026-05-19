import type { Photo } from "react-photo-album";

/** 与 `npm run random-images` 下载尺寸一致 */
export const PHOTOS01_WIDTH = 520;
export const PHOTOS01_HEIGHT = 390;

const SOURCES = [
  "/images/random-download/pic-01-id92.jpg",
  "/images/random-download/pic-01-id564.jpg",
  "/images/random-download/pic-02-id548.jpg",
  "/images/random-download/pic-02-id786.jpg",
  "/images/random-download/pic-03-id22.jpg",
  "/images/random-download/pic-03-id935.jpg",
  "/images/random-download/pic-04-id425.jpg",
  "/images/random-download/pic-04-id355.jpg",
  "/images/random-download/pic-05-id237.jpg",
  "/images/random-download/pic-05-id947.jpg",
  "/images/random-download/pic-06-id493.jpg",
  "/images/random-download/pic-06-id139.jpg",
  "/images/random-download/pic-07-id821.jpg",
  "/images/random-download/pic-07-id985.jpg",
  "/images/random-download/pic-08-id942.jpg",
  "/images/random-download/pic-08-id969.jpg",
  "/images/random-download/pic-09-id724.jpg",
  "/images/random-download/pic-09-id986.jpg",
  "/images/random-download/pic-10-id352.jpg",
  "/images/random-download/pic-10-id182.jpg",
] as const;

export const PHOTOS01_ALBUM_PHOTOS: Photo[] = SOURCES.map((src, index) => ({
  src,
  width: PHOTOS01_WIDTH,
  height: PHOTOS01_HEIGHT,
  alt: `示例照片 ${index + 1}`,
  title: `照片 ${index + 1}`,
}));
