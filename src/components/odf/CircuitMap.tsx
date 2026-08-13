import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { CircuitInfo, endpointLabel } from "./CircuitInfo";
import type { Circuit, Odf, Port } from "./types";

type Props = {
  circuits: Circuit[];
  portsById: Map<string, Port>;
  odfsById: Map<string, Odf>;
  onSelect: (circuit: Circuit) => void;
};

export function CircuitMap({ circuits, portsById, odfsById, onSelect }: Props) {
  if (circuits.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        لا توجد دوائر توصيل مطابقة.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {circuits.map((circuit) => (
        <HoverCard key={circuit.id} openDelay={80} closeDelay={60}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              onClick={() => onSelect(circuit)}
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-panel px-3 py-3 text-right transition-colors hover:border-fiber/60 hover:bg-fiber/10"
            >
              <span className="w-40 shrink-0 truncate font-mono text-xs text-foreground">
                {endpointLabel(circuit.port_a_id, portsById, odfsById)}
              </span>
              <span className="relative flex h-px flex-1 items-center bg-fiber/40">
                <span className="absolute inset-x-0 -top-2 text-center font-mono text-[10px] text-fiber">
                  {circuit.name}
                </span>
              </span>
              <span className="w-40 shrink-0 truncate font-mono text-xs text-foreground">
                {endpointLabel(circuit.port_b_id, portsById, odfsById)}
              </span>
            </button>
          </HoverCardTrigger>
          <HoverCardContent align="center" className="w-72 text-right">
            <CircuitInfo circuit={circuit} ports={portsById} odfs={odfsById} />
          </HoverCardContent>
        </HoverCard>
      ))}
    </div>
  );
}
