import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activity";
import type { Circuit, DataRate, Odf, Port } from "./types";

export type OdfData = { odfs: Odf[]; ports: Port[]; circuits: Circuit[] };

export async function fetchDataRates(): Promise<DataRate[]> {
  const { data, error } = await supabase
    .from("data_rates")
    .select("id, label, sort_order")
    .order("sort_order")
    .order("label");
  if (error) throw error;
  return (data ?? []) as DataRate[];
}

export async function addDataRate(label: string) {
  const clean = label.trim();
  if (!clean) throw new Error("أدخل معدل البيانات");
  const { error } = await supabase.from("data_rates").insert({ label: clean, sort_order: 100 });
  if (error) throw error;
  await logActivity("create", "data_rate", null, clean);
}

export async function deleteDataRate(id: string, label: string) {
  const { error } = await supabase.from("data_rates").delete().eq("id", id);
  if (error) throw error;
  await logActivity("delete", "data_rate", id, label);
}

export async function fetchOdfData(): Promise<OdfData> {
  const [odfsRes, portsRes, circuitsRes] = await Promise.all([
    supabase.from("odfs").select("*").eq("status", "active").order("name"),
    supabase.from("ports").select("*").eq("status", "active").order("number"),
    supabase.from("circuits").select("*").eq("status", "active").order("name"),
  ]);
  if (odfsRes.error) throw odfsRes.error;
  if (portsRes.error) throw portsRes.error;
  if (circuitsRes.error) throw circuitsRes.error;
  return {
    odfs: (odfsRes.data ?? []) as Odf[],
    ports: (portsRes.data ?? []) as Port[],
    circuits: (circuitsRes.data ?? []) as Circuit[],
  };
}

export type OdfInput = {
  name: string;
  site: string;
  mount_type: string;
  port_count: number;
  ports_per_row: number;
  notes: string;
  adapter_type: string;
};

export async function createOdf(input: OdfInput) {
  const { data, error } = await supabase
    .from("odfs")
    .insert({
      name: input.name,
      site: input.site || null,
      mount_type: input.mount_type,
      port_count: input.port_count,
      ports_per_row: input.ports_per_row,
      notes: input.notes || null,
    })
    .select("id")
    .single();
  if (error) throw error;
  const rows = Array.from({ length: input.port_count }, (_, i) => ({
    odf_id: data.id,
    number: i + 1,
    label: `P${i + 1}`,
    adapter_type: input.adapter_type,
  }));
  const portsRes = await supabase.from("ports").insert(rows);
  if (portsRes.error) throw portsRes.error;
  await logActivity("create", "odf", data.id as string, input.name, {
    port_count: input.port_count,
  });
  return data.id as string;
}

export async function updateOdf(id: string, input: OdfInput, currentPorts: Port[]) {
  const { error } = await supabase
    .from("odfs")
    .update({
      name: input.name,
      site: input.site || null,
      mount_type: input.mount_type,
      port_count: input.port_count,
      ports_per_row: input.ports_per_row,
      notes: input.notes || null,
    })
    .eq("id", id);
  if (error) throw error;

  const existing = currentPorts.filter((p) => p.odf_id === id);
  const max = existing.reduce((acc, p) => Math.max(acc, p.number), 0);

  // Apply the chosen adapter type to all existing ports of this ODF.
  if (input.adapter_type) {
    const upd = await supabase
      .from("ports")
      .update({ adapter_type: input.adapter_type })
      .eq("odf_id", id)
      .eq("status", "active");
    if (upd.error) throw upd.error;
  }

  if (input.port_count > max) {
    const rows = Array.from({ length: input.port_count - max }, (_, i) => ({
      odf_id: id,
      number: max + i + 1,
      label: `P${max + i + 1}`,
      adapter_type: input.adapter_type,
    }));
    const res = await supabase.from("ports").insert(rows);
    if (res.error) throw res.error;
  } else if (input.port_count < max) {
    const res = await supabase
      .from("ports")
      .update({ status: "deleted" })
      .eq("odf_id", id)
      .gt("number", input.port_count);
    if (res.error) throw res.error;
  }
  await logActivity("update", "odf", id, input.name);
}

export async function deleteOdf(id: string, name?: string) {
  const portsRes = await supabase.from("ports").select("id").eq("odf_id", id);
  if (portsRes.error) throw portsRes.error;
  const portIds = (portsRes.data ?? []).map((p) => p.id);
  if (portIds.length) {
    const cA = await supabase
      .from("circuits")
      .update({ status: "deleted" })
      .in("port_a_id", portIds);
    if (cA.error) throw cA.error;
    const cB = await supabase
      .from("circuits")
      .update({ status: "deleted" })
      .in("port_b_id", portIds);
    if (cB.error) throw cB.error;
    const pRes = await supabase.from("ports").update({ status: "deleted" }).eq("odf_id", id);
    if (pRes.error) throw pRes.error;
  }
  const { error } = await supabase.from("odfs").update({ status: "deleted" }).eq("id", id);
  if (error) throw error;
  await logActivity("delete", "odf", id, name ?? null);
}

export async function updatePort(
  id: string,
  patch: Partial<Pick<Port, "label" | "adapter_type" | "notes" | "is_disabled">>,
) {
  const { data, error } = await supabase
    .from("ports")
    .update(patch)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("لم يتم تحديث البورت — لا تملك صلاحية التعديل");
  await logActivity("update", "port", id, patch.label ?? null, patch as Record<string, unknown>);
}

export type CircuitInput = {
  name: string;
  port_a_id: string;
  port_b_id: string;
  service_type: string;
  data_rate: string;
  device_a: string;
  device_b: string;
  cable_id: string;
  attenuation_db: string;
  installed_on: string;
  notes: string;
  attachment_url: string;
  attachment_name: string;
};

function toRow(input: CircuitInput) {
  return {
    name: input.name,
    port_a_id: input.port_a_id,
    port_b_id: input.port_b_id,
    service_type: input.service_type || null,
    data_rate: input.data_rate || null,
    device_a: input.device_a || null,
    device_b: input.device_b || null,
    cable_id: input.cable_id || null,
    attenuation_db: input.attenuation_db === "" ? null : Number(input.attenuation_db),
    installed_on: input.installed_on || null,
    notes: input.notes || null,
    attachment_url: input.attachment_url || null,
    attachment_name: input.attachment_name || null,
  };
}

export async function uploadCircuitFile(file: File) {
  const path = `${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
  const up = await supabase.storage.from("circuit-files").upload(path, file);
  if (up.error) throw up.error;
  const signed = await supabase.storage
    .from("circuit-files")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  if (signed.error) throw signed.error;
  return { url: signed.data.signedUrl, name: file.name };
}

export async function createCircuit(input: CircuitInput) {
  const { error } = await supabase.from("circuits").insert(toRow(input));
  if (error) throw error;
  await logActivity("create", "circuit", null, input.name);
}

export type CircuitAudit = {
  /** Port labels before/after, e.g. "ODF-1 / P3". */
  before?: { a: string; b: string };
  after?: { a: string; b: string };
};

export async function updateCircuit(id: string, input: CircuitInput, audit?: CircuitAudit) {
  const { error } = await supabase.from("circuits").update(toRow(input)).eq("id", id);
  if (error) throw error;
  const changedPorts =
    audit?.before && audit?.after &&
    (audit.before.a !== audit.after.a || audit.before.b !== audit.after.b);
  await logActivity(
    "update",
    "circuit",
    id,
    input.name,
    changedPorts
      ? {
          ports_changed: true,
          port_a_before: audit.before!.a,
          port_a_after: audit.after!.a,
          port_b_before: audit.before!.b,
          port_b_after: audit.after!.b,
        }
      : undefined,
  );
}

export async function deleteCircuit(id: string, name?: string) {
  const { error } = await supabase.from("circuits").update({ status: "deleted" }).eq("id", id);
  if (error) throw error;
  await logActivity("delete", "circuit", id, name ?? null);
}

export type OdfExport = {
  odf: Omit<Odf, "id">;
  ports: {
    number: number;
    label: string | null;
    adapter_type: string;
    notes: string | null;
    is_disabled: boolean;
  }[];
  circuits: {
    name: string;
    port_a: number;
    port_b: number;
    service_type: string | null;
    data_rate?: string | null;
    device_a: string | null;
    device_b: string | null;
    cable_id: string | null;
    attenuation_db: number | null;
    installed_on: string | null;
    notes: string | null;
  }[];
};

export type ImportMeta = {
  fileName?: string;
  headers?: string[];
  portHeader?: string | null;
  circuitHeader?: string | null;
  skippedRows?: number;
  totalRows?: number;
  warnings?: string[];
  pairingRule?: string;
  duplicateCircuits?: string[];
};

export async function importOdf(payload: OdfExport, meta?: ImportMeta) {
  const o = payload.odf;
  const { data, error } = await supabase
    .from("odfs")
    .insert({
      name: o.name,
      site: o.site ?? null,
      mount_type: o.mount_type ?? "rack",
      port_count: o.port_count ?? payload.ports.length,
      ports_per_row: o.ports_per_row ?? 12,
      notes: o.notes ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  const odfId = data.id as string;

  const rows = payload.ports.map((p) => ({
    odf_id: odfId,
    number: p.number,
    label: p.label ?? null,
    adapter_type: p.adapter_type || "SC/UPC",
    notes: p.notes ?? null,
    is_disabled: !!p.is_disabled,
  }));
  const ins = await supabase.from("ports").insert(rows).select("id, number");
  if (ins.error) throw ins.error;
  const byNumber = new Map((ins.data ?? []).map((p) => [p.number, p.id]));

  const disabled = new Set(payload.ports.filter((p) => p.is_disabled).map((p) => p.number));
  const circuitRows = (payload.circuits ?? [])
    .filter(
      (c) =>
        byNumber.has(c.port_a) &&
        byNumber.has(c.port_b) &&
        !disabled.has(c.port_a) &&
        !disabled.has(c.port_b),
    )
    .flatMap((c) => {
      const portAId = byNumber.get(c.port_a);
      const portBId = byNumber.get(c.port_b);
      if (!portAId || !portBId) return [];
      return [{
        name: c.name,
        port_a_id: portAId,
        port_b_id: portBId,
        service_type: c.service_type ?? null,
        data_rate: c.data_rate ?? null,
        device_a: c.device_a ?? null,
        device_b: c.device_b ?? null,
        cable_id: c.cable_id ?? null,
        attenuation_db: c.attenuation_db ?? null,
        installed_on: c.installed_on ?? null,
        notes: c.notes ?? null,
      }];
    });
  if (circuitRows.length) {
    const cres = await supabase.from("circuits").insert(circuitRows);
    if (cres.error) throw cres.error;
  }
  await logActivity("import", "odf", odfId, o.name, {
    ports: rows.length,
    circuits: circuitRows.length,
    file: meta?.fileName ?? null,
    headers: meta?.headers ?? null,
    port_header: meta?.portHeader ?? null,
    circuit_header: meta?.circuitHeader ?? null,
    skipped_rows: meta?.skippedRows ?? 0,
    total_rows: meta?.totalRows ?? rows.length,
    warnings: meta?.warnings ?? [],
    pairing_rule: meta?.pairingRule ?? null,
    duplicate_circuits: meta?.duplicateCircuits ?? [],
  });
  return odfId;
}
