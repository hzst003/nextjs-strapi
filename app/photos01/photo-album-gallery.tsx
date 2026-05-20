"use client";

import { ZoomIn } from "lucide-react";
import { useMemo, useState } from "react";
import type { Photo, Render } from "react-photo-album";
import {
  ColumnsPhotoAlbum,
  MasonryPhotoAlbum,
  RowsPhotoAlbum,
} from "react-photo-album";
import "react-photo-album/columns.css";
import "react-photo-album/masonry.css";
import "react-photo-album/rows.css";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

import { cn } from "@/lib/utils";

type LayoutMode = "rows" | "columns" | "masonry";

const LAYOUT_OPTIONS: { id: LayoutMode; label: string }[] = [
  { id: "rows", label: "行布局" },
  { id: "columns", label: "列布局" },
  { id: "masonry", label: "瀑布流" },
];

const albumRender: Render = {
  button: (props) => (
    <button
      {...props}
      type="button"
      className={cn(
        "group relative block overflow-hidden rounded-lg border-0 bg-transparent p-0",
        "cursor-zoom-in transition-shadow duration-300",
        "hover:shadow-lg hover:shadow-black/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        props.className,
      )}
    />
  ),
  image: (props) => (
    <img
      {...props}
      className={cn(
        "block size-full object-cover transition-transform duration-300 ease-out will-change-transform",
        "group-hover:scale-[1.03]",
        props.className,
      )}
    />
  ),
  extras: (_, { photo }) => {
    const label = photo.title ?? photo.alt;
    return (
      <>
        <div
          className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/35"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden
        >
          <span className="flex size-11 items-center justify-center rounded-full border border-white/25 bg-white/20 text-white shadow-lg backdrop-blur-sm">
            <ZoomIn className="size-5" strokeWidth={2} />
          </span>
        </div>
        {label ? (
          <p className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-1 truncate bg-gradient-to-t from-black/75 via-black/40 to-transparent px-3 pb-2.5 pt-10 text-center text-xs font-medium text-white opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            {label}
          </p>
        ) : null}
      </>
    );
  },
};

type PhotoAlbumGalleryProps = {
  photos: readonly Photo[];
};

export function PhotoAlbumGallery({ photos }: PhotoAlbumGalleryProps) {
  const [layout, setLayout] = useState<LayoutMode>("rows");
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  const slides = useMemo(
    () =>
      photos.map((photo) => ({
        src: photo.src,
        width: photo.width,
        height: photo.height,
        alt: photo.alt,
        title: photo.title,
      })),
    [photos],
  );

  const common = {
    photos,
    spacing: 12,
    padding: 2,
    render: albumRender,
    onClick: ({ index }: { index: number }) => setLightboxIndex(index),
    sizes: {
      size: "min(100vw - 3rem, 72rem)",
      sizes: [
        { viewport: "(max-width: 640px)", size: "calc(100vw - 3rem)" },
      ],
    },
  } as const;

  return (
    <div className="space-y-6">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="相册布局"
      >
        {LAYOUT_OPTIONS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={layout === id}
            onClick={() => setLayout(id)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              layout === id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="w-full">
        {layout === "rows" && (
          <RowsPhotoAlbum {...common} targetRowHeight={280} />
        )}
        {layout === "columns" && (
          <ColumnsPhotoAlbum
            {...common}
            columns={(width) => {
              if (width < 480) return 1;
              if (width < 900) return 2;
              return 3;
            }}
          />
        )}
        {layout === "masonry" && (
          <MasonryPhotoAlbum
            {...common}
            columns={(width) => {
              if (width < 480) return 1;
              if (width < 768) return 2;
              if (width < 1100) return 3;
              return 4;
            }}
          />
        )}
      </div>

      <Lightbox
        open={lightboxIndex >= 0}
        index={lightboxIndex}
        close={() => setLightboxIndex(-1)}
        slides={slides}
        plugins={[Zoom]}
        zoom={{ maxZoomPixelRatio: 3 }}
        controller={{ closeOnBackdropClick: true }}
        styles={{
          container: { backgroundColor: "rgba(0, 0, 0, 0.92)" },
        }}
      />
    </div>
  );
}
