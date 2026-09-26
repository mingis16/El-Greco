import { cacheLife, cacheTag } from "next/cache";
import { menuData } from "@/data/menu.generated";
import type { MenuData } from "@/lib/menu-types";

export const MENU_CACHE_TAG = "menu";

/**
 * Single entry point for menu reads. Cached like ISR: served from cache,
 * refreshed in the background at most hourly, and purgeable on demand with
 * `revalidateTag(MENU_CACHE_TAG, "max")` once edits come from the database.
 *
 * Today it returns the oddmenu import (`npm run menu:import`). When Supabase
 * is wired up, only this function's body changes.
 */
export async function getMenu(): Promise<MenuData> {
  "use cache";
  cacheLife("hours");
  cacheTag(MENU_CACHE_TAG);

  return menuData;
}
