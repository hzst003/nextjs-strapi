"use client";

import { useState } from "react";
import type { Photo } from "react-photo-album";
import {
  ColumnsPhotoAlbum,
  MasonryPhotoAlbum,
  RowsPhotoAlbum,
} from "react-photo-album";
import "react-photo-album/columns.css";
import "react-photo-album/masonry.css";
import "react-photo-album/rows.css";

import { cn } from "@/lib/utils";

type LayoutMode = "rows" | "columns" | "masonry";

const LAYOUT_OPTIONS: { id: LayoutMode; label: string }[] = [
  { id: "rows", label: "行布局" },
  { id: "columns", label: "列布局" },
  { id: "masonry", label: "瀑布流" },
];

type PhotoAlbumGalleryProps = {
  photos: readonly Photo[];
};

export function PhotoAlbumGallery({ photos }: PhotoAlbumGalleryProps) {
  const [layout, setLayout] = useState<LayoutMode>("rows");

  const common = {
    photos,
    spacing: 12,
    padding: 2,
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
    </div>
  );
}
