import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  /** "light" (white) for dark backgrounds, "dark" for cream/white ones, "mint" for accents. */
  tone?: "light" | "dark" | "mint";
  className?: string;
  priority?: boolean;
  /** Render without a home link, e.g. inside a pass or PDF preview. */
  plain?: boolean;
};

const SRC = { light: "/brand/logo-white.png", dark: "/brand/logo-dark.png", mint: "/brand/logo-mint.png" };

export function Logo({ tone = "light", className = "h-12 w-auto", priority, plain }: LogoProps) {
  const image = (
    <Image
      src={SRC[tone]}
      alt="El Greco Café - Resto"
      width={831}
      height={517}
      priority={priority}
      className={className}
    />
  );
  if (plain) return image;
  return (
    <Link href="/" aria-label="El Greco Café - Resto, home" className="inline-flex shrink-0 rounded-lg">
      {image}
    </Link>
  );
}
