import { Paperclip } from "lucide-react";
import type { Circuit, Odf, Port } from "./types";

type Props = {
  circuit: Circuit;
  ports: Map<string, Port>;
  odfs: Map<string, Odf>;
};

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}

export function endpointLabel(portId: string, ports: Map<string, Port>, odfs: Map<string, Odf>) {
  const port = ports.get(portId);
  if (!port) return "—";
  const odf = odfs.get(port.odf_id);
  return `${odf?.name ?? "ODF"} · P${port.number}`;
}

export function CircuitInfo({ circuit, ports, odfs }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-fiber" />
        <span className="font-mono text-sm font-semibold text-foreground">{circuit.name}</span>
      </div>
      <div className="rounded-md bg-muted/50 p-2 font-mono text-xs text-foreground">
        {endpointLabel(circuit.port_a_id, ports, odfs)}
        <span className="mx-2 text-fiber">↔</span>
        {endpointLabel(circuit.port_b_id, ports, odfs)}
      </div>
      <div className="space-y-1">
        <Row label="نوع الخدمة" value={circuit.service_type} />
        <Row label="الطرف A" value={circuit.device_a} />
        <Row label="الطرف B" value={circuit.device_b} />
        <Row label="Cable ID" value={circuit.cable_id} />
        <Row
          label="Attenuation"
          value={circuit.attenuation_db === null ? null : `${circuit.attenuation_db} dB`}
        />
        <Row label="تاريخ التركيب" value={circuit.installed_on} />
      </div>
      {circuit.notes ? (
        <p className="border-t border-border pt-2 text-xs text-muted-foreground">{circuit.notes}</p>
      ) : null}
      {circuit.attachment_url ? (
        <a
          href={circuit.attachment_url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 border-t border-border pt-2 text-xs text-fiber underline"
        >
          <Paperclip className="h-3 w-3" />
          {circuit.attachment_name || "مرفق"}
        </a>
      ) : null}
    </div>
  );
}
