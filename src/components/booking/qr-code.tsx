import { qrSvgPath } from "@/lib/qr";

export function QrCode({ value, label, className = "" }: { value: string; label: string; className?: string }) {
  const { viewBox, d } = qrSvgPath(value);
  return (
    <svg
      viewBox={`0 0 ${viewBox} ${viewBox}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={viewBox} height={viewBox} fill="#ffffff" />
      <path d={d} fill="#1d1915" />
    </svg>
  );
}
