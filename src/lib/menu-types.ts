export type MenuGroupId =
  | "brunch"
  | "appetizers"
  | "mains"
  | "specialities"
  | "desserts"
  | "drinks";

export interface MenuOption {
  id: string;
  name: string;
  /** Price in Sierra Leonean leones (SLE). */
  price: number;
}

export interface MenuAddon {
  id: string;
  name: string;
  selectType: "single" | "multi";
  options: MenuOption[];
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  /** Base price in SLE. 0 when the price comes from `variants`. */
  price: number;
  weight?: string;
  prepMinutes?: number;
  available: boolean;
  /** Mutually exclusive versions of the item, each with its own price. */
  variants: MenuOption[];
  addons: MenuAddon[];
}

export interface MenuCategory {
  id: string;
  slug: string;
  name: string;
  group: MenuGroupId;
  items: MenuItem[];
}

export interface MenuData {
  source: string;
  importedAt: string;
  currency: "SLE";
  place: {
    name: string;
    phone: string;
    address: string;
    city: string;
    country: string;
  };
  categories: MenuCategory[];
}
