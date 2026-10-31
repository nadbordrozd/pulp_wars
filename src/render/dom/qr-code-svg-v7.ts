import {
  encodeQrCodeV7,
  QR_QUIET_ZONE_V7,
  qrSvgPathV7,
} from "../../online/qr-code";

const SVG_NS = "http://www.w3.org/2000/svg";

/** The QR code's largest side in CSS pixels (the compact lobby panel). */
export const QR_MAX_PIXELS_V7 = 180;

/**
 * The QR code's side in CSS pixels: a whole number of pixels per module
 * (crisp on any screen), as large as fits in {@link QR_MAX_PIXELS_V7}.
 * The join link is a version 3 or 4 symbol: 148 or 164 px.
 */
export function qrPixelSizeV7(modulesWithQuietZone: number): number {
  const scale = Math.max(
    2,
    Math.floor(QR_MAX_PIXELS_V7 / modulesWithQuietZone),
  );
  return scale * modulesWithQuietZone;
}

/**
 * A QR code of `text` as an SVG image: dark modules on a white square with
 * the four-module quiet zone, in fixed black and white whatever the theme
 * (phone cameras read dark on light). `label` is its accessible name; the
 * encoded text is kept on `data-payload`.
 */
export function qrCodeSvgV7(
  documentRoot: Document,
  text: string,
  label: string,
  className = "v7-qr-code",
): SVGSVGElement {
  const code = encodeQrCodeV7(text);
  const side = code.size + 2 * QR_QUIET_ZONE_V7;
  const pixels = String(qrPixelSizeV7(side));
  const svg = documentRoot.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${side} ${side}`);
  svg.setAttribute("width", pixels);
  svg.setAttribute("height", pixels);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", label);
  svg.setAttribute("shape-rendering", "crispEdges");
  svg.setAttribute("class", className);
  svg.dataset.payload = text;
  svg.dataset.version = String(code.version);
  const title = documentRoot.createElementNS(SVG_NS, "title");
  title.textContent = label;
  const background = documentRoot.createElementNS(SVG_NS, "rect");
  background.setAttribute("width", String(side));
  background.setAttribute("height", String(side));
  background.setAttribute("fill", "#ffffff");
  const modules = documentRoot.createElementNS(SVG_NS, "path");
  modules.setAttribute("d", qrSvgPathV7(code));
  modules.setAttribute("fill", "#000000");
  svg.append(title, background, modules);
  return svg;
}
