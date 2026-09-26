export const site = {
  name: "El Greco Kafe - Resto",
  shortName: "El Greco",
  title: "El Greco Kafe - Resto | Modern Dining & Cafe",
  tagline: "Good food. Good vibe. More memories.",
  description:
    "Sea-view dining in Aberdeen, Freetown: brunch, mezze, grills, seafood and cocktails, plus private events, birthdays, date nights and business meetings. Book your table online.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  phone: "+23299423234",
  phoneDisplay: "+232 99 423 234",
  whatsappNumber: "23299423234",
  email: "elgreco.sl232@gmail.com",
  social: {
    instagram: "https://www.instagram.com/el_greco_sl",
    tiktok: "https://www.tiktok.com/@el_greco_sl",
    handle: "@el_greco_sl",
  },
  address: {
    street: "63 Sir Samuel Lewis Road",
    area: "Aberdeen",
    city: "Freetown",
    country: "Sierra Leone",
    countryCode: "SL",
  },
  mapsUrl: "https://maps.app.goo.gl/wVJUofr1hEu1b6rc7",
} as const;

export const DEFAULT_WHATSAPP_MESSAGE = "Hello El Greco, I have an inquiry";

export function whatsappLink(message: string = DEFAULT_WHATSAPP_MESSAGE) {
  return `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export const navLinks = [
  { href: "/menu", label: "Menu" },
  { href: "/reservations", label: "Reservations" },
  { href: "/events", label: "Events" },
  { href: "/#visit", label: "Visit" },
] as const;
