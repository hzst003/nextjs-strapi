import { cache } from "react";

import {
  getStrapiURL,
  parseGlobalPayload,
  strapiFetch,
  strapiGlobalApiQuery,
  type GlobalPageContent,
} from "./strapi";

/** 全站共享：根布局与 `/globalpage` 同一次请求内去重。 */
export const loadStrapiGlobal = cache(
  async (): Promise<GlobalPageContent | null> => {
    if (!getStrapiURL()) return null;
    try {
      const payload = await strapiFetch<unknown>(strapiGlobalApiQuery(), {
        cache: "no-store",
      });
      return parseGlobalPayload(payload);
    } catch {
      return null;
    }
  },
);
