import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { CircuitInfo } from "./CircuitInfo";
import {
  ADAPTER_BORDER,
  ADAPTER_DOT,
  ADAPTER_LABELS,
  ADAPTER_STROKE,
  adapterKind,
  type Circuit,
  type Odf,
  type Port,
} from "./types";

type Props = {
  ports: Port[];
  circuitByPort: Map<string, Circuit>;
  portsById: Map<string, Port>;
  odfsById: Map<string, Odf>;
  linkMode: boolean;
  selected: string[];
  matches: Set<string>;
  portsPerRow: number;
  focusCircuitId?: string | null;
  onPortClick: (port: Port) => void;
  onLinkClick?: (circuit: Circuit) => void;
};

/** Builds an orthogonal path with rounded corners through the given points. */
function roundedPath(points: [number, number][], radius = 8) {
  if (points.length < 2) return "";
  const first = points[0]!;
  let d = `M ${first[0]} ${first[1]}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const next = points[i + 1]!;
    const inLen = Math.hypot(curr[0] - prev[0], curr[1] - prev[1]);
    const outLen = Math.hypot(next[0] - curr[0], next[1] - curr[1]);
    const r = Math.max(0, Math.min(radius, inLen / 2, outLen / 2));
    const ax = curr[0] + ((prev[0] - curr[0]) / (inLen || 1)) * r;
    const ay = curr[1] + ((prev[1] - curr[1]) / (inLen || 1)) * r;
    const bx = curr[0] + ((next[0] - curr[0]) / (outLen || 1)) * r;
    const by = curr[1] + ((next[1] - curr[1]) / (outLen || 1)) * r;
    d += ` L ${ax} ${ay} Q ${curr[0]} ${curr[1]}, ${bx} ${by}`;
  }
  const last = points[points.length - 1]!;
  return `${d} L ${last[0]} ${last[1]}`;
}

export function PortGrid({
  ports,
  circuitByPort,
  portsById,
  odfsById,
  linkMode,
  selected,
  matches,
  portsPerRow,
  focusCircuitId,
  onPortClick,
  onLinkClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef(new Map<string, HTMLButtonElement>());
  type Link = {
    id: string;
    d: string;
    stroke: string;
    strokeB: string;
    circuit: Circuit;
    label: string;
    ends: [number, number][];
  };
  const [links, setLinks] = useState<Link[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [rowGap, setRowGap] = useState(48);
  const [padBottom, setPadBottom] = useState(24);

  const focusedPorts = useMemo(() => {
    const set = new Set<string>();
    if (!focusCircuitId) return set;
    for (const [portId, circuit] of circuitByPort) {
      if (circuit.id === focusCircuitId) set.add(portId);
    }
    return set;
  }, [focusCircuitId, circuitByPort]);

  // Bring the highlighted circuit into view when it changes.
  useEffect(() => {
    if (!focusCircuitId) return;
    const first = [...focusedPorts].map((id) => nodeRefs.current.get(id)).find(Boolean);
    first?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusCircuitId, focusedPorts]);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const grid = gridRef.current;
    if (!container || !grid) return;
    const box = container.getBoundingClientRect();

    const seen = new Set<string>();
    const next: Link[] = [];
    // lane counters per row band, so the gap can grow with the links used
    const laneByRow = new Map<number, number>();
    let maxLanes = 1;
    let maxY = 0;
    let maxX = 0;
    for (const port of ports) {
      const circuit = circuitByPort.get(port.id);
      if (!circuit || seen.has(circuit.id)) continue;
      if (
        portsById.get(circuit.port_a_id)?.is_disabled ||
        portsById.get(circuit.port_b_id)?.is_disabled
      )
        continue;
      const a = nodeRefs.current.get(circuit.port_a_id);
      const b = nodeRefs.current.get(circuit.port_b_id);
      if (!a || !b) continue;
      seen.add(circuit.id);
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      const x1 = ra.left - box.left + ra.width / 2;
      const y1 = ra.top - box.top + ra.height;
      const x2 = rb.left - box.left + rb.width / 2;
      const y2 = rb.top - box.top + rb.height;

      // Route through the empty band under each row so lines never disappear
      // behind the port cards. Each link in a row gets its own lane.
      const rowKey = Math.round(y1);
      const laneIndex = laneByRow.get(rowKey) ?? 0;
      laneByRow.set(rowKey, laneIndex + 1);
      maxLanes = Math.max(maxLanes, laneIndex + 1);
      const lane = 14 + laneIndex * 12;
      const sameRow = Math.abs(y1 - y2) < 4;

      let points: [number, number][];
      if (sameRow) {
        const band = y1 + lane;
        points = [
          [x1, y1],
          [x1, band],
          [x2, band],
          [x2, y2],
        ];
      } else {
        const bandA = y1 + lane;
        const bandB = y2 + lane;
        // vertical run sits in the gutter beside the target column
        const channel = rb.left - box.left - 5;
        points = [
          [x1, y1],
          [x1, bandA],
          [channel, bandA],
          [channel, bandB],
          [x2, bandB],
          [x2, y2],
        ];
      }

      for (const [px, py] of points) {
        if (py > maxY) maxY = py;
        if (px > maxX) maxX = px;
      }

      next.push({
        id: circuit.id,
        d: roundedPath(points),
        stroke: ADAPTER_STROKE[adapterKind(portsById.get(circuit.port_a_id)?.adapter_type)],
        strokeB: ADAPTER_STROKE[adapterKind(portsById.get(circuit.port_b_id)?.adapter_type)],
        circuit,
        ends: [
          [x1, y1],
          [x2, y2],
        ],
        label: `${circuit.name} — بورت ${portsById.get(circuit.port_a_id)?.number ?? "?"} ↔ بورت ${
          portsById.get(circuit.port_b_id)?.number ?? "?"
        }`,
      });
    }
    // the board grows with the number of lanes actually in use
    const neededGap = Math.min(220, 32 + maxLanes * 14);
    setRowGap((prev) => (Math.abs(prev - neededGap) > 1 ? neededGap : prev));

    // grow the container so the lowest drawn line always has room (no clipping)
    const gridRect = grid.getBoundingClientRect();
    const gridBottom = gridRect.bottom - box.top;
    const overflow = maxY + 12 - gridBottom;
    setPadBottom((prev) => {
      const nextPad = Math.max(24, Math.min(400, Math.round(prev + overflow)));
      return Math.abs(nextPad - prev) > 1 ? nextPad : prev;
    });

    setSize((prev) => {
      const w = Math.max(box.width, maxX + 12);
      const h = Math.max(box.height, container.scrollHeight, maxY + 12);
      return Math.abs(prev.w - w) > 1 || Math.abs(prev.h - h) > 1 ? { w, h } : prev;
    });
    setLinks(next);
  }, [ports, circuitByPort, portsById]);


  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const container = containerRef.current;
    const grid = gridRef.current;
    if (!container) return;
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => measure());
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(container);
    if (grid) ro.observe(grid);
    for (const el of nodeRefs.current.values()) ro.observe(el);
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
    };
  }, [measure]);

  return (
    <div ref={containerRef} className="relative">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        <span className="font-semibold text-foreground">دليل الألوان:</span>
        {[...new Set(ports.map((p) => adapterKind(p.adapter_type)))].map((kind) => (
          <span key={kind} className="inline-flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-full", ADAPTER_DOT[kind])} />
            <span
              className="inline-block h-0.5 w-5 rounded-full"
              style={{ background: ADAPTER_STROKE[kind] }}
            />
            {ADAPTER_LABELS[kind]}
          </span>
        ))}
      </div>
      <svg
        className="pointer-events-none absolute inset-0 z-10 overflow-visible"
        width={size.w}
        height={size.h}
      >
        <defs>
          {links.map((link) => {
            const [a, b] = link.ends;
            return (
              <linearGradient
                key={link.id}
                id={`link-${link.id}`}
                gradientUnits="userSpaceOnUse"
                x1={a?.[0] ?? 0}
                y1={a?.[1] ?? 0}
                x2={b?.[0] ?? 0}
                y2={b?.[1] ?? 0}
              >
                <stop offset="0%" stopColor={link.stroke} />
                <stop offset="100%" stopColor={link.strokeB} />
              </linearGradient>
            );
          })}
        </defs>
        {links.map((link) => {
          const focused = focusCircuitId === link.id;
          const active = hovered === link.id || focused;
          const paint =
            link.stroke === link.strokeB ? link.stroke : `url(#link-${link.id})`;
          return (
            <g
              key={link.id}
              opacity={(hovered || focusCircuitId) && !active ? 0.2 : 1}
              className={focused ? "animate-pulse" : undefined}
            >
              {focused ? (
                <path
                  d={link.d}
                  fill="none"
                  stroke={link.stroke}
                  strokeOpacity={0.35}
                  strokeWidth={16}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
              {/* soft halo so the line stays readable over any background */}
              <path
                d={link.d}
                fill="none"
                stroke="var(--color-background)"
                strokeOpacity={0.95}
                strokeWidth={active ? 10 : 7}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={link.d}
                fill="none"
                stroke={paint}
                strokeWidth={active ? 4 : 2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {link.ends.map(([cx, cy], i) => (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={active ? 4 : 3}
                  fill={i === 0 ? link.stroke : link.strokeB}
                  stroke="var(--color-background)"
                  strokeWidth={1.5}
                />
              ))}
              <path
                d={link.d}
                fill="none"
                stroke="transparent"
                strokeWidth={16}
                className={cn("pointer-events-auto", onLinkClick ? "cursor-pointer" : "cursor-help")}
                onMouseEnter={() => setHovered(link.id)}
                onMouseLeave={() => setHovered((h) => (h === link.id ? null : h))}
                onClick={() => onLinkClick?.(link.circuit)}
              >
                <title>{link.label}</title>
              </path>
            </g>
          );
        })}
      </svg>
      {hovered ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center">
          <div className="rounded-md border border-border bg-popover px-3 py-1.5 text-xs font-medium text-popover-foreground shadow-lg">
            {links.find((l) => l.id === hovered)?.label}
          </div>
        </div>
      ) : null}
      <div
        ref={gridRef}
        className="grid gap-x-2"
        style={{
          gridTemplateColumns: `repeat(${Math.max(1, portsPerRow)}, minmax(0, 1fr))`,
          rowGap: `${rowGap}px`,
          paddingBottom: `${padBottom}px`,
        }}
      >

        {ports.map((port) => {
          const circuit = circuitByPort.get(port.id);
          const isSelected = selected.includes(port.id);
          const isMatch = matches.has(port.id);
          const kind = adapterKind(port.adapter_type);

          const button = (
            <button
              type="button"
              ref={(el) => {
                if (el) nodeRefs.current.set(port.id, el);
                else nodeRefs.current.delete(port.id);
              }}
              onClick={() => onPortClick(port)}
              className={cn(
                "group relative z-20 flex w-full flex-col items-center gap-1 rounded-lg border-2 bg-panel px-2 py-3 transition-colors hover:bg-accent",
                ADAPTER_BORDER[kind],
                circuit && "bg-fiber/10 hover:bg-fiber/20",
                port.is_disabled &&
                  "border-destructive bg-destructive/10 text-destructive hover:bg-destructive/20",
                isSelected && "ring-2 ring-signal",
                isMatch && "ring-2 ring-primary",
                focusedPorts.has(port.id) &&
                  "z-30 scale-[1.06] ring-4 ring-signal ring-offset-2 ring-offset-background shadow-[0_0_26px_var(--signal)]",
                linkMode && "cursor-crosshair",
              )}
            >
              <span
                className={cn(
                  "font-mono text-sm font-semibold text-foreground",
                  port.is_disabled && "text-destructive line-through",
                )}
              >
                {port.number}
              </span>
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  port.is_disabled ? "bg-destructive" : ADAPTER_DOT[kind],
                )}
              />
              <span
                className={cn(
                  "max-w-full truncate text-[10px] text-muted-foreground",
                  port.is_disabled && "text-destructive",
                )}
              >
                {port.is_disabled ? "لا يعمل" : port.label || port.adapter_type}
              </span>
            </button>
          );

          if (!circuit) return <div key={port.id}>{button}</div>;

          return (
            <HoverCard key={port.id} openDelay={80} closeDelay={60}>
              <HoverCardTrigger asChild>{button}</HoverCardTrigger>
              <HoverCardContent align="center" className="w-72 text-right">
                <CircuitInfo circuit={circuit} ports={portsById} odfs={odfsById} />
              </HoverCardContent>
            </HoverCard>
          );
        })}
      </div>
    </div>
  );
}
