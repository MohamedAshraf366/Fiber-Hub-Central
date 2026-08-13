import { adapterKind, type Odf, type Port } from "./types";
import { safeName } from "./sheet";

/** Counts ports by adapter type, most common first. */
export function adapterBreakdown(ports: Port[]) {
  const map = new Map<string, number>();
  for (const p of ports) {
    const key = p.adapter_type || "—";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([type, count]) => ({ type, count, kind: adapterKind(type) }))
    .sort((a, b) => b.count - a.count);
}

/** Stable public host (published app) so scanning never lands on a Lovable editor/preview login. */
const PUBLIC_ORIGIN = "https://project--5b7bfe48-0b16-490e-973b-cd737e5d20dd.lovable.app";

/** Live URL encoded in the ODF QR — scanning always shows the current data. */
export function odfQrUrl(odf: Odf) {
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  // Editor/preview hosts require a Lovable login, so always print the public host.
  const isPreview =
    host.includes("id-preview--") || host.includes("lovableproject.com") || host === "localhost";
  const origin = !host || isPreview ? PUBLIC_ORIGIN : window.location.origin;
  return `${origin}/odf/${odf.id}`;
}

/** Human-readable summary (used in PDF/report headers, not in the QR itself). */
export function odfQrText(odf: Odf, ports: Port[]) {
  const types = adapterBreakdown(ports)
    .map((t) => `${t.type} x${t.count}`)
    .join(", ");
  return [
    `ODF: ${odf.name}`,
    odf.site ? `Site: ${odf.site}` : null,
    `Ports: ${ports.length || odf.port_count}`,
    `Types: ${types || "—"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function qrDataUrl(text: string, width = 512) {
  const QR = await import("qrcode");
  return QR.toDataURL(text, { width, margin: 1, errorCorrectionLevel: "M" });
}

export async function downloadOdfQr(odf: Odf, ports: Port[]) {
  void ports;
  const url = await qrDataUrl(odfQrUrl(odf), 720);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName(odf.name)}-QR.png`;
  a.click();
}
