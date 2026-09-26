import QRCode from "qrcode";

/** Standard 4-module quiet zone so phone cameras lock on reliably. */
export const QR_MARGIN = 4;

export function qrModules(text: string) {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
  const { size, data } = modules;
  return { size, isDark: (row: number, col: number) => data[row * size + col] === 1 };
}

/** One SVG path for all dark modules, in module units offset by the margin. */
export function qrSvgPath(text: string) {
  const { size, isDark } = qrModules(text);
  let d = "";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isDark(r, c)) d += `M${c + QR_MARGIN} ${r + QR_MARGIN}h1v1h-1z`;
    }
  }
  return { viewBox: size + QR_MARGIN * 2, d };
}
