import type { OdfExport } from "./api";
import type { Circuit, Odf, Port } from "./types";

export type SheetRow = Record<string, unknown>;

export type ParsedSheet = {
  rows: SheetRow[];
  suggestedName: string | null;
  headers: string[];
};

/** How ports get grouped into circuits when the sheet has no peer column. */
export type PairingRule = "auto" | "pairs" | "order" | "none";

export const PAIRING_LABELS: Record<PairingRule, string> = {
  auto: "تلقائي (يكتشف الترتيب المناسب)",
  pairs: "أزواج ثابتة (1↔2، 3↔4)",
  order: "حسب ترتيب الصفوف (كل صفين معًا)",
  none: "بدون ربط تلقائي",
};

const str = (v: unknown) => (v === undefined || v === null ? "" : String(v).trim());

/** Reads the first matching column, ignoring case, spaces and punctuation. */
function pick(row: SheetRow, ...names: string[]): string {
  const norm = (s: string) => s.toLowerCase().replace(/[\s_\-./]/g, "");
  const map = new Map<string, unknown>();
  for (const [k, v] of Object.entries(row)) map.set(norm(k), v);
  for (const n of names) {
    const v = map.get(norm(n));
    if (v !== undefined && str(v) !== "") return str(v);
  }
  return "";
}

const PORT_HEADERS = new Set(["port", "portno", "portnumber", "البورت"]);

const CIRCUIT_HEADER_NAMES = [
  "Circuit number",
  "Circuit",
  "CR",
  "circuit id",
  "اسم الدائرة",
];
const PORT_HEADER_NAMES = ["PORT", "Port", "port no", "port number", "البورت"];

const normHeader = (s: string) => s.toLowerCase().replace(/[\s_\-./]/g, "");

/** Returns the actual header text in the sheet that matches one of the candidates. */
export function detectHeader(headers: string[], candidates: string[]): string | null {
  const wanted = new Set(candidates.map(normHeader));
  return headers.find((h) => wanted.has(normHeader(h))) ?? null;
}

export type ImportPreview = {
  fileName: string;
  headers: string[];
  portHeader: string | null;
  circuitHeader: string | null;
  odfName: string;
  portCount: number;
  circuitCount: number;
  skippedRows: number;
  totalRows: number;
  warnings: string[];
  payload: OdfExport;
  /** Kept so the pairing rule can be changed in the preview dialog. */
  parsed: ParsedSheet;
  fallbackName: string;
  rule: PairingRule;
  appliedRule: Exclude<PairingRule, "auto">;
  duplicateOdfName: boolean;
  duplicateCircuits: string[];
};

export type ExistingNames = { odfNames?: string[]; circuitNames?: string[] };

/** Builds the payload plus a human-readable summary shown before importing. */
export function analyzeSheet(
  parsed: ParsedSheet,
  fallbackName: string,
  fileName: string,
  rule: PairingRule = "auto",
  existing: ExistingNames = {},
): ImportPreview {
  const built = buildPayload2(parsed.rows, parsed.suggestedName ?? fallbackName, rule);
  const payload = built.payload;
  const portHeader = detectHeader(parsed.headers, PORT_HEADER_NAMES);
  const circuitHeader = detectHeader(parsed.headers, CIRCUIT_HEADER_NAMES);
  const skippedRows = Math.max(0, parsed.rows.length - payload.ports.length);
  const warnings: string[] = [];
  if (!circuitHeader) warnings.push("لم يتم العثور على عمود رقم الدائرة — سيتم استيراد البورتات فقط.");
  if (!detectHeader(parsed.headers, ["ODF Name", "ODF", "اسم الإطار"]) && !parsed.suggestedName)
    warnings.push(`لا يوجد عمود لاسم الإطار — سيُستخدم "${payload.odf.name}".`);
  if (skippedRows) warnings.push(`${skippedRows} صفًا سيتم تجاهله (رقم بورت غير صالح).`);
  warnings.push(...built.warnings);

  const norm = (s: string) => s.trim().toLowerCase();
  const odfNames = new Set((existing.odfNames ?? []).map(norm));
  const circuitNames = new Set((existing.circuitNames ?? []).map(norm));
  const duplicateOdfName = odfNames.has(norm(payload.odf.name));
  const duplicateCircuits = [
    ...new Set(payload.circuits.map((c) => c.name).filter((n) => circuitNames.has(norm(n)))),
  ];
  if (duplicateOdfName) warnings.push(`اسم الإطار "${payload.odf.name}" موجود بالفعل.`);
  if (duplicateCircuits.length)
    warnings.push(`${duplicateCircuits.length} رقم دائرة مكرر مع دوائر موجودة.`);

  return {
    fileName,
    headers: parsed.headers.filter(Boolean),
    portHeader,
    circuitHeader,
    odfName: payload.odf.name,
    portCount: payload.ports.length,
    circuitCount: payload.circuits.length,
    skippedRows,
    totalRows: parsed.rows.length,
    warnings,
    payload,
    parsed,
    fallbackName,
    rule,
    appliedRule: built.appliedRule,
    duplicateOdfName,
    duplicateCircuits,
  };
}

/** Finds the actual header row in workbooks that start with an ODF title. */
export function worksheetToRows(sheet: unknown, XLSX: typeof import("xlsx")): ParsedSheet {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet as import("xlsx").WorkSheet, {
    header: 1,
    defval: "",
    raw: true,
  });
  const norm = (value: unknown) => str(value).toLowerCase().replace(/[\s_\-./]/g, "");
  const headerIndex = matrix.findIndex((row) => row.some((cell) => PORT_HEADERS.has(norm(cell))));
  if (headerIndex < 0) throw new Error("لم يتم العثور على عمود PORT في الملف");

  const title = matrix
    .slice(0, headerIndex)
    .flat()
    .map(str)
    .find(Boolean);
  const headers = matrix[headerIndex]?.map(str) ?? [];
  const rows = matrix.slice(headerIndex + 1).flatMap((values) => {
    if (!values.some((value) => str(value) !== "")) return [];
    const row: SheetRow = {};
    headers.forEach((header, index) => {
      if (header) row[header] = values[index] ?? "";
    });
    return [row];
  });

  return { rows, suggestedName: title ?? null, headers };
}

/**
 * Turns any spreadsheet into an ODF payload. Supports the app's own export
 * layout (Port / Circuit / Linked To ...) and field survey sheets such as
 * PORT / COMPANY / DIRECTION A / DIRECTION B / CR / NOTE / bit rate.
 */
export function rowsToPayload(rows: SheetRow[], name: string, rule: PairingRule = "auto"): OdfExport {
  return buildPayload2(rows, name, rule).payload;
}

type BuiltPayload = {
  payload: OdfExport;
  appliedRule: Exclude<PairingRule, "auto">;
  warnings: string[];
};

/** Pairs port numbers according to the chosen rule. */
function peerMap(numbers: number[], rule: Exclude<PairingRule, "auto">) {
  const peers = new Map<number, number>();
  if (rule === "none") return peers;
  if (rule === "pairs") {
    const present = new Set(numbers);
    for (const n of numbers) {
      const partner = n % 2 === 1 ? n + 1 : n - 1;
      if (partner > 0 && present.has(partner)) peers.set(n, partner);
    }
    return peers;
  }
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    const a = numbers[i];
    const b = numbers[i + 1];
    if (a === undefined || b === undefined) continue;
    peers.set(a, b);
    peers.set(b, a);
  }
  return peers;
}

function buildPayload2(rows: SheetRow[], name: string, rule: PairingRule): BuiltPayload {
  const parsed = rows
    .map((r) => ({
      number: Number(pick(r, "Port", "PORT", "البورت", "port no", "port number")),
      label: pick(r, "Label", "اسم البورت") || null,
      adapter_type: pick(r, "Adapter", "adapter type", "نوع الوصلة") || "SC/UPC",
      notes: [
        pick(r, "Notes", "NOTE", "ملاحظات"),
        pick(r, "Node long", "node long"),
        pick(r, "node in sohag Local", "node in sohag", "node", "Node"),
      ]
        .filter(Boolean)
        .join(" | ") || null,
      is_disabled: /disabled|لا يعمل|معطل/i.test(pick(r, "Status", "الحالة")),
      circuit: pick(r, "Circuit", "Circuit number", "CR", "circuit id", "اسم الدائرة"),
      peer: Number(pick(r, "Linked To", "peer", "port b", "البورت المقابل")),
      service: pick(r, "Service", "service type", "COMPANY", "الشركة", "نوع الخدمة") || null,
      data_rate: pick(r, "Data Rate", "Bit rate", "bit rate", "bitrate", "rate", "معدل البيانات") || null,
      device_a: pick(r, "Direction A", "DIRECTION A", "device a", "الطرف A") || null,
      device_b: pick(r, "Direction B", "DIRECTION B", "device b", "الطرف B") || null,
      cable_id: pick(r, "Cable ID", "cable") || null,
      att: pick(r, "Attenuation (dB)", "attenuation", "att"),
    }))
    .filter((p) => Number.isFinite(p.number) && p.number > 0);

  if (!parsed.length) throw new Error("لم يتم العثور على بورتات صالحة في الملف");

  const odfName =
    rows.map((r) => pick(r, "ODF Name", "ODF", "اسم الإطار")).find(Boolean) || name;

  const numbers = parsed.map((p) => p.number);
  const warnings: string[] = [];
  let appliedRule: Exclude<PairingRule, "auto"> = rule === "auto" ? "pairs" : rule;
  if (rule === "auto") {
    const byPairs = peerMap(numbers, "pairs");
    const byOrder = peerMap(numbers, "order");
    if (byOrder.size > byPairs.size) {
      appliedRule = "order";
      warnings.push(
        "ترتيب البورتات في الملف لا يتوافق مع التجميع 1↔2 / 3↔4 — تم الربط حسب ترتيب الصفوف.",
      );
    }
  }
  const peers = peerMap(numbers, appliedRule);

  const seen = new Set<string>();
  const circuits: OdfExport["circuits"] = [];
  for (const p of parsed) {
    if (!p.circuit) continue;
    // An explicit peer column always wins; otherwise use the chosen rule.
    const peer =
      Number.isFinite(p.peer) && p.peer > 0 ? p.peer : (peers.get(p.number) ?? p.number);
    const key = [p.number, peer].sort((a, b) => a - b).join("-");
    if (seen.has(key)) continue;
    seen.add(key);
    circuits.push({
      name: p.circuit,
      port_a: p.number,
      port_b: peer,
      service_type: p.service,
      data_rate: p.data_rate,
      device_a: p.device_a,
      device_b: p.device_b,
      cable_id: p.cable_id,
      attenuation_db: p.att === "" ? null : Number(p.att),
      installed_on: null,
      notes: null,
    });
  }

  const maxPort = parsed.reduce((acc, p) => Math.max(acc, p.number), 0);

  const payload: OdfExport = {
    odf: {
      name: odfName,
      site: null,
      mount_type: "rack",
      port_count: Math.max(maxPort, parsed.length),
      ports_per_row: 12,
      notes: null,
    },
    ports: parsed.map((p) => ({
      number: p.number,
      label: p.label,
      adapter_type: p.adapter_type,
      notes: p.notes,
      is_disabled: p.is_disabled,
    })),
    circuits,
  };
  return { payload, appliedRule, warnings };
}

export function buildPayload(odf: Odf, ports: Port[], circuits: Circuit[]): OdfExport {
  const byId = new Map(ports.map((p) => [p.id, p]));
  return {
    odf: {
      name: odf.name,
      site: odf.site,
      mount_type: odf.mount_type,
      port_count: odf.port_count,
      ports_per_row: odf.ports_per_row,
      notes: odf.notes,
    },
    ports: ports.map((p) => ({
      number: p.number,
      label: p.label,
      adapter_type: p.adapter_type,
      notes: p.notes,
      is_disabled: p.is_disabled,
    })),
    circuits: circuits.flatMap((c) => {
      const portA = byId.get(c.port_a_id);
      const portB = byId.get(c.port_b_id);
      if (!portA || !portB) return [];
      return [{
        name: c.name,
        port_a: portA.number,
        port_b: portB.number,
        service_type: c.service_type,
        data_rate: c.data_rate,
        device_a: c.device_a,
        device_b: c.device_b,
        cable_id: c.cable_id,
        attenuation_db: c.attenuation_db,
        installed_on: c.installed_on,
        notes: c.notes,
      }];
    }),
  };
}

export function tableRows(payload: OdfExport) {
  const circuitOf = new Map<number, (typeof payload.circuits)[number]>();
  for (const c of payload.circuits) {
    circuitOf.set(c.port_a, c);
    circuitOf.set(c.port_b, c);
  }
  return payload.ports.map((p) => {
    const c = circuitOf.get(p.number);
    const peer = c ? (c.port_a === p.number ? c.port_b : c.port_a) : "";
    return {
      Port: p.number,
      Label: p.label ?? "",
      Adapter: p.adapter_type,
      Status: p.is_disabled ? "Disabled" : "Active",
      Circuit: c?.name ?? "",
      "Linked To": peer,
      Service: c?.service_type ?? "",
      "Data Rate": c?.data_rate ?? "",
      "Direction A": c?.device_a ?? "",
      "Direction B": c?.device_b ?? "",
      "Attenuation (dB)": c?.attenuation_db ?? "",
      Notes: p.notes ?? "",
    };
  });
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const safeName = (s: string) => s.replace(/[^\w.\-]+/g, "_").slice(0, 60) || "ODF";

export const TEMPLATE_HEADERS = [
  "ODF Name",
  "PORT",
  "COMPANY",
  "DIRECTION A",
  "DIRECTION B",
  "Circuit number",
  "Node long",
  "node in sohag Local",
  "Bit rate",
] as const;

/**
 * Blank import template: a title row with the ODF name followed by the exact
 * headers the importer detects, so a filled file uploads on the first try.
 */
export async function downloadTemplate(odfName = "ODF-1") {
  const XLSX = await import("xlsx");
  const example = (port: number) => [odfName, port, "", "", "", "", "", "", ""];
  const sheet = XLSX.utils.aoa_to_sheet([
    [odfName],
    [...TEMPLATE_HEADERS],
    example(1),
    example(2),
  ]);
  sheet["!cols"] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(12, h.length + 4) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "ODF");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  download(
    new Blob([out], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "ODF-Template.xlsx",
  );
}
