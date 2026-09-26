import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import { CookieConsent } from "@/components/layout/cookie-consent";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { site } from "@/lib/site";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.title, template: `%s | ${site.name}` },
  description: site.description,
  applicationName: site.name,
  keywords: [
    "El Greco",
    "restaurant Freetown",
    "book a table Freetown",
    "birthday venue Freetown",
    "conference room Freetown",
    "cafe Aberdeen",
    "brunch Freetown",
    "seafood Sierra Leone",
    "cocktails Freetown",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.name,
    title: site.title,
    description: site.description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#1e1e1e",
};

const restaurantJsonLd = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: site.name,
  url: site.url,
  telephone: site.phone,
  email: site.email,
  image: `${site.url}/opengraph-image.jpg`,
  logo: `${site.url}/brand/logo-dark.png`,
  sameAs: [site.social.instagram, site.social.tiktok],
  address: {
    "@type": "PostalAddress",
    streetAddress: `${site.address.street}, ${site.address.area}`,
    addressLocality: site.address.city,
    addressCountry: site.address.countryCode,
  },
  hasMap: site.mapsUrl,
  hasMenu: `${site.url}/menu`,
  servesCuisine: ["Mediterranean", "Lebanese", "West African", "Indian", "Seafood", "Pizza", "Cafe"],
  currenciesAccepted: "SLE",
  acceptsReservations: true,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(restaurantJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <a
          href="#main"
          className="sr-only z-[70] rounded-full bg-primary px-4 py-2 font-semibold text-primary-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <WhatsAppButton />
        <CookieConsent />
      </body>
    </html>
  );
}
