import type { SVGProps } from "react";

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TikTokIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M16.6 3c.3 2.2 1.6 3.7 3.9 3.9v3.1c-1.4.1-2.7-.3-3.9-1.1v6.2c0 3.6-2.6 5.9-5.8 5.9-3.1 0-5.6-2.4-5.6-5.6 0-3.5 3-5.9 6.5-5.4v3.2c-1.6-.4-3.3.6-3.3 2.3 0 1.4 1.1 2.4 2.4 2.4 1.5 0 2.5-1 2.5-2.8V3h3.3Z" />
    </svg>
  );
}
