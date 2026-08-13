export type Odf = {
  id: string;
  name: string;
  site: string | null;
  mount_type: string;
  port_count: number;
  ports_per_row: number;
  notes: string | null;
};

export type Port = {
  id: string;
  odf_id: string;
  number: number;
  label: string | null;
  adapter_type: string;
  notes: string | null;
  is_disabled: boolean;
};

export type Circuit = {
  id: string;
  name: string;
  port_a_id: string;
  port_b_id: string;
  service_type: string | null;
  data_rate: string | null;
  device_a: string | null;
  device_b: string | null;
  cable_id: string | null;
  attenuation_db: number | null;
  installed_on: string | null;
  notes: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
};

export const MOUNT_LABELS: Record<string, string> = {
  rack: "Rack Mount",
  wall: "Wall Mount",
};

export const ADAPTER_TYPES = ["SC/UPC", "SC/APC", "LC/UPC", "LC/APC", "FC/UPC", "ST"];
export const DEFAULT_DATA_RATES = ["E1", "STM1", "1G", "10G", "100G", "200G", "400G"];

export type DataRate = { id: string; label: string; sort_order: number };

export const PORT_COUNTS = [12, 24, 48, 96, 144];
export const PORTS_PER_ROW_OPTIONS = [4, 6, 8, 12, 16, 24];

export type AdapterKind = "upc" | "apc" | "metal" | "other";

export function adapterKind(adapter: string | null | undefined): AdapterKind {
  const a = (adapter ?? "").toUpperCase();
  if (a.startsWith("FC")) return "metal";
  if (a.includes("APC")) return "apc";
  if (a.includes("UPC")) return "upc";
  return "other";
}

export const ADAPTER_DOT: Record<AdapterKind, string> = {
  upc: "bg-upc",
  apc: "bg-apc",
  metal: "bg-metal",
  other: "bg-muted-foreground/40",
};

export const ADAPTER_BORDER: Record<AdapterKind, string> = {
  upc: "border-upc/60",
  apc: "border-apc/60",
  metal: "border-metal/60",
  other: "border-border",
};

export const ADAPTER_STROKE: Record<AdapterKind, string> = {
  upc: "var(--upc)",
  apc: "var(--apc)",
  metal: "var(--metal)",
  other: "var(--wire-other)",
};

/** Curated accent hues (no purple, so ODF cards never clash with the brand color). */
const ODF_HUES = [250, 200, 165, 140, 95, 60, 30, 15, 320];

/** Stable per-ODF accent hue so each frame is instantly recognisable. */
export function odfHue(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 9973;
  return ODF_HUES[h % ODF_HUES.length]!;
}

export function odfInitials(name: string) {
  const parts = name.split(/[\s\-_/]+/).filter(Boolean);
  const digits = name.match(/\d+/)?.[0];
  const letters = (parts[0] ?? name).slice(0, 2).toUpperCase();
  return digits ? `${letters[0] ?? ""}${digits}`.slice(0, 4) : letters;
}

export const ADAPTER_LABELS: Record<AdapterKind, string> = {
  upc: "UPC (أزرق)",
  apc: "APC (أخضر)",
  metal: "FC / معدني",
  other: "أخرى",
};
