import type { Metadata } from "next";
import Image from "next/image";
import { MenuBrowser } from "@/components/menu/menu-browser";
import { getMenu } from "@/lib/menu";
import { photos, type Photo } from "@/lib/photos";

const CATEGORY_PHOTOS: Record<string, Photo> = {
  brunch: photos.eggsBenedict,
  sandwiches: photos.waffleSandwich,
  african: photos.acheke,
  "fast-food": photos.burgerAndFries,
  appetizers: photos.springRolls,
  salads: photos.fineDiningPlate,
  chicken: photos.friedChickenRice,
  pasta: photos.pastaGarlicBread,
  "beef-and-lamb": photos.steakPlate,
  seafood: photos.lobsterPlatter,
  pizza: photos.flatbreadPizza,
  desserts: photos.chocolateCake,
  mocktails: photos.pinaColada,
  cocktails: photos.margarita,
  "hot-beverages": photos.cappuccino,
  "iced-beverages": photos.icedLatte,
  milkshakes: photos.milkshakes,
  frappes: photos.frappe,
};

export const metadata: Metadata = {
  title: "Menu",
  description:
    "The full El Greco Kafe - Resto menu: brunch, mezze, grills, seafood, pizza, Indian and African specialities, desserts, coffee and cocktails, with prices in leones.",
  alternates: { canonical: "/menu" },
  openGraph: { url: "/menu" },
};

const importedFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" });

export default async function MenuPage() {
  const menu = await getMenu();
  const itemCount = menu.categories.reduce((n, c) => n + c.items.length, 0);

  return (
    <>
      <section className="relative overflow-hidden bg-charcoal-900 pt-10 pb-16 text-cream sm:pt-14 sm:pb-20">
        <div className="absolute inset-0">
          <Image
            src={photos.diningEvening.src}
            alt=""
            fill
            priority
            placeholder="blur"
            sizes="100vw"
            className="object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-linear-to-r from-charcoal-900 via-charcoal-900/85 to-charcoal-900/40" />
        </div>
        <div className="container-page relative">
          <p className="text-xs font-semibold tracking-[0.3em] text-mint-400 uppercase">
            Kitchen &amp; bar
          </p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">Our menu</h1>
          <p className="mt-3 max-w-xl text-charcoal-200">
            {itemCount} dishes and drinks across {menu.categories.length} sections. Tap{" "}
            <span className="font-semibold text-cream">Add</span> on anything to order to your table or for pickup.
          </p>
        </div>
      </section>

      <MenuBrowser categories={menu.categories} categoryPhotos={CATEGORY_PHOTOS} />

      <p className="container-page -mt-16 pb-16 text-xs text-ink-muted">
        Prices are in Sierra Leonean leones (Le). Menu last synced{" "}
        {importedFormat.format(new Date(menu.importedAt))}. Please tell your server about any
        allergies.
      </p>
    </>
  );
}
