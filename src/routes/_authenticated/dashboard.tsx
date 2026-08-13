import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Cable,
  Layers,
  LogOut,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  Waypoints,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  createCircuit,
  createOdf,
  deleteCircuit,
  deleteOdf,
  fetchOdfData,
  importOdf,
  updateCircuit,
  updateOdf,
  updatePort,
  type CircuitInput,
  type OdfExport,
  type OdfInput,
} from "@/components/odf/api";
import { PortGrid } from "@/components/odf/PortGrid";
import { CircuitMap } from "@/components/odf/CircuitMap";
import { OdfDialog } from "@/components/odf/OdfDialog";
import { PortDialog } from "@/components/odf/PortDialog";
import { CircuitDialog } from "@/components/odf/CircuitDialog";
import { OdfTransfer } from "@/components/odf/OdfTransfer";
import { downloadAllWorkbook } from "@/components/odf/BulkExport";
import { BackupReminder } from "@/components/odf/BackupReminder";
import { ManagerContactDialog } from "@/components/odf/ManagerContactDialog";
import { markExported } from "@/lib/reminders";
import { logActivity } from "@/lib/activity";
import { ThemeToggle } from "@/components/odf/ThemeToggle";
import { ChangePasswordDialog } from "@/components/odf/ChangePasswordDialog";
import {
  ADAPTER_DOT,
  MOUNT_LABELS,
  odfHue,
  odfInitials,
  type Circuit,
  type Port,
} from "@/components/odf/types";
import { OdfQrDialog } from "@/components/odf/OdfQrDialog";
import { adapterBreakdown } from "@/components/odf/qr";
import { useAuth } from "@/hooks/useAuth";
import { AppFooter } from "@/components/odf/AppFooter";
import { OfflineBanner } from "@/components/odf/OfflineBanner";


export const Route = createFileRoute("/_authenticated/dashboard")({
  validateSearch: (search: Record<string, unknown>): { circuit?: string; odf?: string } => ({
    ...(typeof search["circuit"] === "string" ? { circuit: search["circuit"] as string } : {}),
    ...(typeof search["odf"] === "string" ? { odf: search["odf"] as string } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Fiber Hub Central — إدارة أطر التوزيع الضوئي ODF" },
      {
        name: "description",
        content:
          "منصة لإدارة أطر التوزيع الضوئي (ODF): توثيق البورتات، ربط الدوائر الضوئية، وتصدير المخططات إلى Excel و PDF.",
      },
      { property: "og:title", content: "Fiber Hub Central — إدارة أطر التوزيع الضوئي" },
      {
        property: "og:description",
        content: "توثيق بورتات الـ ODF وربط الدوائر الضوئية وتصدير التقارير.",
      },
    ],
  }),
  component: OdfManagerPage,
});

function OdfManagerPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { me, perms } = useAuth();
  const { data, isLoading, error } = useQuery({ queryKey: ["odf-data"], queryFn: fetchOdfData });
  const { circuit: circuitParam, odf: odfParam } = Route.useSearch();

  const [activeOdfId, setActiveOdfId] = useState<string | null>(null);
  const [focusCircuitId, setFocusCircuitId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);

  const [linkMode, setLinkMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [odfDialog, setOdfDialog] = useState<{ open: boolean; editing: boolean }>({
    open: false,
    editing: false,
  });
  const [portDialog, setPortDialog] = useState<Port | null>(null);
  const [circuitDialog, setCircuitDialog] = useState<{
    open: boolean;
    circuit: Circuit | null;
    a: string;
    b: string;
  }>({ open: false, circuit: null, a: "", b: "" });
  const [confirmDeleteOdf, setConfirmDeleteOdf] = useState(false);

  const odfs = data?.odfs ?? [];
  const currentOdf = odfs.find((o) => o.id === activeOdfId) ?? odfs[0] ?? null;

  const portsById = useMemo(
    () => new Map((data?.ports ?? []).map((p) => [p.id, p])),
    [data?.ports],
  );
  const odfsById = useMemo(() => new Map(odfs.map((o) => [o.id, o])), [odfs]);
  const circuitByPort = useMemo(() => {
    const map = new Map<string, Circuit>();
    for (const c of data?.circuits ?? []) {
      map.set(c.port_a_id, c);
      map.set(c.port_b_id, c);
    }
    return map;
  }, [data?.circuits]);

  const currentPorts = useMemo(
    () =>
      (data?.ports ?? [])
        .filter((p) => p.odf_id === currentOdf?.id)
        .sort((a, b) => a.number - b.number),
    [data?.ports, currentOdf?.id],
  );

  const term = search.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!term) return new Set<string>();
    const set = new Set<string>();
    for (const p of currentPorts) {
      const c = circuitByPort.get(p.id);
      const haystack = [
        p.label,
        p.adapter_type,
        p.notes,
        String(p.number),
        c?.name,
        c?.service_type,
        c?.device_a,
        c?.device_b,
        c?.cable_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (haystack.includes(term)) set.add(p.id);
    }
    return set;
  }, [term, currentPorts, circuitByPort]);

  const filteredCircuits = useMemo(() => {
    const list = (data?.circuits ?? []).filter(
      (c) =>
        portsById.get(c.port_a_id)?.odf_id === currentOdf?.id ||
        portsById.get(c.port_b_id)?.odf_id === currentOdf?.id,
    );
    if (!term) return list;
    return list.filter((c) =>
      [c.name, c.service_type, c.device_a, c.device_b, c.cable_id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [data?.circuits, portsById, currentOdf?.id, term]);

  const matchedOdf = useMemo(
    () => (term ? odfs.find((o) => `${o.name} ${o.site ?? ""}`.toLowerCase().includes(term)) : undefined),
    [term, odfs],
  );

  const matchedOdfs = useMemo(
    () =>
      term
        ? odfs.filter((o) => `${o.name} ${o.site ?? ""}`.toLowerCase().includes(term)).slice(0, 6)
        : [],
    [term, odfs],
  );

  const searchResults = useMemo(() => {
    if (!term) return [];
    return (data?.circuits ?? [])
      .filter((c) =>
        [c.name, c.cable_id, c.service_type, c.device_a, c.device_b]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term),
      )
      .slice(0, 20)
      .map((c) => {
        const pa = portsById.get(c.port_a_id);
        const pb = portsById.get(c.port_b_id);
        const odfA = pa ? odfsById.get(pa.odf_id) : undefined;
        const odfB = pb ? odfsById.get(pb.odf_id) : undefined;
        return { circuit: c, odfA, odfB, pa, pb };
      });
  }, [term, data?.circuits, portsById, odfsById]);

  const matchedCircuit = searchResults[0]?.circuit;

  function openCircuit(c: Circuit) {
    const odfId = portsById.get(c.port_a_id)?.odf_id ?? portsById.get(c.port_b_id)?.odf_id;
    if (odfId) setActiveOdfId(odfId);
    setFocusCircuitId(c.id);
    setShowResults(false);
  }

  // Deep link from a scanned QR code: /dashboard?circuit=<id>
  useEffect(() => {
    if (!circuitParam || !data) return;
    const c = (data.circuits ?? []).find((x) => x.id === circuitParam);
    if (!c) return;
    const odfId = portsById.get(c.port_a_id)?.odf_id ?? portsById.get(c.port_b_id)?.odf_id;
    if (odfId) setActiveOdfId(odfId);
    setFocusCircuitId(c.id);
  }, [circuitParam, data, portsById]);

  // Deep link from a scanned ODF QR code: /dashboard?odf=<id>
  useEffect(() => {
    if (!odfParam || !data) return;
    if ((data.odfs ?? []).some((o) => o.id === odfParam)) setActiveOdfId(odfParam);
  }, [odfParam, data]);

  // The glow fades away on its own so the board goes back to normal.
  useEffect(() => {
    if (!focusCircuitId) return;
    const t = window.setTimeout(() => setFocusCircuitId(null), 6000);
    return () => window.clearTimeout(t);
  }, [focusCircuitId]);

  // Jump straight to the ODF while typing.
  useEffect(() => {
    if (!term) return;
    if (matchedOdf) {
      setActiveOdfId(matchedOdf.id);
      return;
    }
    const odfId = matchedCircuit ? portsById.get(matchedCircuit.port_a_id)?.odf_id : undefined;
    if (odfId) setActiveOdfId(odfId);
  }, [term, matchedOdf, matchedCircuit, portsById]);

  function jumpToMatch() {
    if (!term) return;
    if (matchedCircuit) {
      openCircuit(matchedCircuit);
      return;
    }
    if (matchedOdf) {
      setActiveOdfId(matchedOdf.id);
      toast.success(`تم فتح ${matchedOdf.name}`);
      return;
    }
    toast.error("لا توجد نتائج مطابقة");
  }


  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["odf-data"] });

  const saveOdf = useMutation({
    mutationFn: async (input: OdfInput) =>
      odfDialog.editing && currentOdf
        ? updateOdf(currentOdf.id, input, data?.ports ?? [])
        : createOdf(input),
    onSuccess: (res) => {
      if (typeof res === "string") setActiveOdfId(res);
      setOdfDialog({ open: false, editing: false });
      void invalidate();
      toast.success("تم حفظ الـ ODF");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeOdf = useMutation({
    mutationFn: async () => {
      if (!currentOdf) throw new Error("لم يتم تحديد ODF للحذف");
      return deleteOdf(currentOdf.id, currentOdf.name);
    },
    onSuccess: () => {
      setActiveOdfId(null);
      setConfirmDeleteOdf(false);
      void invalidate();
      toast.success("تم حذف الـ ODF");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const savePort = useMutation({
    mutationFn: async (patch: {
      label: string;
      adapter_type: string;
      notes: string;
      is_disabled: boolean;
    }) => {
      if (!portDialog) throw new Error("لم يتم تحديد بورت للتحديث");
      return updatePort(portDialog.id, patch);
    },
    onSuccess: () => {
      setPortDialog(null);
      void invalidate();
      toast.success("تم تحديث البورت");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveCircuit = useMutation({
    mutationFn: async (input: CircuitInput) => {
      const prev = circuitDialog.circuit;
      if (!prev) return createCircuit(input);
      const name = (id: string) => {
        const p = portsById.get(id);
        const odf = p ? odfsById.get(p.odf_id) : undefined;
        return p ? `${odf?.name ?? "?"} / P${p.number}` : "—";
      };
      return updateCircuit(prev.id, input, {
        before: { a: name(prev.port_a_id), b: name(prev.port_b_id) },
        after: { a: name(input.port_a_id), b: name(input.port_b_id) },
      });
    },
    onSuccess: () => {
      setCircuitDialog({ open: false, circuit: null, a: "", b: "" });
      setSelected([]);
      void invalidate();
      toast.success("تم حفظ الدائرة");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeCircuit = useMutation({
    mutationFn: async (id: string) => deleteCircuit(id, circuitDialog.circuit?.name),
    onSuccess: () => {
      setCircuitDialog({ open: false, circuit: null, a: "", b: "" });
      void invalidate();
      toast.success("تم فصل الدائرة");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const runImport = useMutation({
    mutationFn: async ({
      payload,
      meta,
    }: {
      payload: OdfExport;
      meta?: Parameters<typeof importOdf>[1];
    }) => {
      try {
        return await importOdf(payload, meta);
      } catch (e) {
        await logActivity("import_failed", "odf", null, payload.odf.name, {
          file: meta?.fileName ?? null,
          error: (e as Error).message,
        });
        throw e;
      }
    },
    onSuccess: (id) => {
      setActiveOdfId(id);
      void invalidate();
      toast.success("تم استيراد الـ ODF");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handlePortClick(port: Port) {
    if (!perms.edit) {
      const circuit = circuitByPort.get(port.id);
      if (circuit)
        setCircuitDialog({ open: true, circuit, a: circuit.port_a_id, b: circuit.port_b_id });
      return;
    }
    if (!linkMode) {
      const circuit = circuitByPort.get(port.id);
      if (circuit) {
        setCircuitDialog({
          open: true,
          circuit,
          a: circuit.port_a_id,
          b: circuit.port_b_id,
        });
        return;
      }
      setPortDialog(port);
      return;
    }
    if (port.is_disabled) {
      toast.error("هذا البورت خارج الخدمة");
      return;
    }
    if (circuitByPort.has(port.id)) {
      toast.error("هذا البورت مرتبط بدائرة بالفعل");
      return;
    }
    const next = selected.includes(port.id)
      ? selected.filter((id) => id !== port.id)
      : [...selected, port.id];
    if (next.length === 2) {
      const [portAId, portBId] = next;
      if (!portAId || !portBId) return;
      setCircuitDialog({ open: true, circuit: null, a: portAId, b: portBId });
      setSelected(next);
      return;
    }
    setSelected(next);
  }

  const usedPorts = currentPorts.filter((p) => circuitByPort.has(p.id)).length;
  const disabledPorts = currentPorts.filter((p) => p.is_disabled).length;
  const affectedCircuits = useMemo(() => {
    const ids = new Set(currentPorts.map((p) => p.id));
    return (data?.circuits ?? []).filter((c) => ids.has(c.port_a_id) || ids.has(c.port_b_id));
  }, [currentPorts, data?.circuits]);


  return (
    <main className="app-shell flex min-h-screen flex-col text-foreground">
      <OfflineBanner />

      <ManagerContactDialog me={me} />
      <BackupReminder
        me={me}
        odfs={odfs}
        ports={data?.ports ?? []}
        circuits={data?.circuits ?? []}
        onDownloadAll={() => {
          void downloadAllWorkbook(odfs, data?.ports ?? [], data?.circuits ?? []).then(() => {
            if (me) void markExported(me.id);
          });
        }}
      />
      <header className="border-b border-fiber/25 bg-background/95 shadow-[0_1px_0_0_color-mix(in_oklab,var(--fiber)_18%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 sm:gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fiber/15 text-fiber ring-1 ring-fiber/25">
              <Waypoints className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-base font-bold leading-tight tracking-tight">
                <span className="text-brand-gradient">Fiber Hub</span> Central
              </h1>
              <p className="text-xs text-muted-foreground">إدارة أطر التوزيع الضوئي ODF</p>
            </div>
          </div>
          <div className="ms-auto flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div className="relative order-first w-full sm:order-none sm:w-auto">
              <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              {term ? (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSearch("");
                    setShowResults(false);
                  }}
                  aria-label="مسح البحث"
                  className="absolute start-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
                onBlur={() => window.setTimeout(() => setShowResults(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") jumpToMatch();
                  if (e.key === "Escape") setShowResults(false);
                }}
                placeholder="ابحث برقم الدائرة أو اسم الـ ODF..."
                className="h-10 w-full rounded-xl border-border/70 bg-card/70 pe-9 ps-9 shadow-sm transition-shadow focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-primary)_18%,transparent)] sm:w-80"
              />
              {showResults && term ? (
                <div className="absolute inset-x-0 top-full z-50 mt-2 max-h-[26rem] w-full overflow-hidden rounded-2xl border border-border bg-popover text-right shadow-xl sm:w-96">
                  <div className="flex items-center justify-between border-b border-border/70 bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                    <span>Enter للانتقال · Esc للإغلاق</span>
                    <span className="font-mono">
                      {matchedOdfs.length} إطار · {searchResults.length} دائرة
                    </span>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-1.5">
                    {matchedOdfs.length === 0 && searchResults.length === 0 ? (
                      <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                        لا توجد نتائج مطابقة
                      </p>
                    ) : null}

                    {matchedOdfs.length ? (
                      <p className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        الأطر
                      </p>
                    ) : null}
                    {matchedOdfs.map((odf) => (
                      <button
                        key={odf.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setActiveOdfId(odf.id);
                          setShowResults(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-right transition-colors hover:bg-accent"
                      >
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-bold text-white"
                          style={{
                            background: `linear-gradient(140deg, oklch(0.7 0.16 ${odfHue(odf.name)}), oklch(0.55 0.16 ${odfHue(odf.name)}))`,
                          }}
                        >
                          {odfInitials(odf.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-mono text-sm font-semibold">
                            {odf.name}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {odf.site || "بدون موقع"}
                          </span>
                        </span>
                        <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </button>
                    ))}

                    {searchResults.length ? (
                      <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        الدوائر
                      </p>
                    ) : null}
                    {searchResults.map(({ circuit, odfA, odfB, pa, pb }) => (
                      <button
                        key={circuit.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => openCircuit(circuit)}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-right transition-colors hover:bg-accent"
                      >
                        <Cable className="mt-0.5 h-4 w-4 shrink-0 text-fiber" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-mono text-sm font-semibold">
                            {circuit.name}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {odfA?.name ?? "—"} / P{pa?.number ?? "?"} ↔ {odfB?.name ?? "—"} / P
                            {pb?.number ?? "?"}
                          </span>
                        </span>
                        {circuit.data_rate ? (
                          <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
                            {circuit.data_rate}
                          </Badge>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <OdfTransfer
              odf={currentOdf}
              ports={currentPorts}
              circuits={filteredCircuits}
              existingOdfNames={odfs.map((o) => o.name)}
              existingCircuitNames={(data?.circuits ?? []).map((c) => c.name)}
              onImport={(payload, meta) => {
                const p = meta?.preview;
                runImport.mutate({
                  payload,
                  meta: {
                    fileName: meta?.fileName ?? "",
                    headers: p?.headers ?? [],
                    portHeader: p?.portHeader ?? null,
                    circuitHeader: p?.circuitHeader ?? null,
                    skippedRows: p?.skippedRows ?? 0,
                    totalRows: p?.totalRows ?? payload.ports.length,
                    warnings: p?.warnings ?? [],
                    pairingRule: p?.appliedRule ?? "",
                    duplicateCircuits: p?.duplicateCircuits ?? [],
                  },
                });
              }}
              canImport={perms.edit}
            />
            <ThemeToggle />
            {perms.edit ? (
              <Button size="sm" onClick={() => setOdfDialog({ open: true, editing: false })}>
                <Plus className="h-4 w-4" /> ODF جديد
              </Button>
            ) : null}
            {perms.manage ? (
              <Button size="sm" variant="outline" asChild>
                <Link to="/settings">
                  <Settings className="h-4 w-4" /> الإعدادات
                </Link>
              </Button>
            ) : null}
            <ChangePasswordDialog />
            <span className="hidden items-center gap-2 rounded-lg border border-border bg-card px-2 py-1 text-xs font-medium sm:inline-flex">
              {me?.full_name}
            </span>
            <Button
              size="sm"
              variant="destructive"
              aria-label="تسجيل الخروج"
              className="font-semibold shadow-sm"
              onClick={async () => {
                await queryClient.cancelQueries();
                queryClient.clear();
                await supabase.auth.signOut();
                void navigate({ to: "/", replace: true });
              }}
            >
              <LogOut className="h-4 w-4" /> تسجيل الخروج
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-4 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="surface min-w-0 rounded-2xl p-2.5 lg:sticky lg:top-28 lg:self-start">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              الأطر
            </h2>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {odfs.length}
            </Badge>
          </div>
          {isLoading ? (
            <p className="px-1 text-sm text-muted-foreground">جارٍ التحميل...</p>
          ) : null}
          {error ? <p className="px-1 text-sm text-destructive">تعذّر تحميل البيانات</p> : null}
          <div className="max-h-[calc(100vh-14rem)] space-y-2 overflow-y-auto pe-0.5">
          {odfs.map((odf) => {
            const hue = odfHue(odf.name);
            const own = (data?.ports ?? []).filter((p) => p.odf_id === odf.id);
            const ownIds = new Set(own.map((p) => p.id));
            const linked = (data?.circuits ?? []).filter(
              (c) => ownIds.has(c.port_a_id) || ownIds.has(c.port_b_id),
            ).length;
            const active = currentOdf?.id === odf.id;
            const dimmed = term.length > 0 && !matchedOdfs.some((o) => o.id === odf.id) && !active;
            return (
              <button
                key={odf.id}
                type="button"
                onClick={() => {
                  setActiveOdfId(odf.id);
                  setSelected([]);
                }}
                style={{
                  borderInlineStartColor: `oklch(0.65 0.16 ${hue})`,
                  background: active
                    ? `linear-gradient(135deg, color-mix(in oklab, oklch(0.65 0.16 ${hue}) 18%, var(--color-card)), var(--color-card))`
                    : `color-mix(in oklab, oklch(0.65 0.16 ${hue}) 4%, var(--color-card))`,
                  boxShadow: active
                    ? `0 6px 18px -8px color-mix(in oklab, oklch(0.65 0.16 ${hue}) 55%, transparent)`
                    : undefined,
                }}
                className={cn(
                  "surface flex w-full items-start gap-2.5 rounded-xl border-s-[5px] p-3 text-right transition-all hover:-translate-y-0.5",
                  active && "ring-1 ring-primary/40",
                  dimmed && "opacity-45 saturate-50",
                )}
              >
                <span
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-bold text-white shadow-sm"
                  style={{
                    background: `linear-gradient(140deg, oklch(0.7 0.16 ${hue}), oklch(0.55 0.16 ${hue}))`,
                  }}
                >
                  {odfInitials(odf.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 font-mono text-sm font-semibold">
                    <span className="truncate">{odf.name}</span>
                    {active ? <Layers className="h-3.5 w-3.5 shrink-0 opacity-70" /> : null}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {odf.site || "بدون موقع"} · {MOUNT_LABELS[odf.mount_type] ?? odf.mount_type}
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono">
                      {own.length || odf.port_count} بورت
                    </span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono">
                      {linked} دائرة
                    </span>
                    {adapterBreakdown(own)
                      .slice(0, 3)
                      .map((t) => (
                        <span key={t.type} className="inline-flex items-center gap-1">
                          <span className={cn("h-2 w-2 rounded-full", ADAPTER_DOT[t.kind])} />
                          {t.type}
                        </span>
                      ))}
                  </span>
                </span>
              </button>
            );
          })}
          </div>
          {!isLoading && odfs.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              لا توجد أطر بعد — ابدأ بإضافة ODF.
            </p>
          ) : null}
        </aside>

        <section className="min-w-0 space-y-4">
          {currentOdf ? (
            <>
              <div className="surface flex flex-wrap items-center gap-3 rounded-xl p-4">
                <div>
                  <h2 className="font-mono text-lg font-bold">{currentOdf.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {currentOdf.notes || currentOdf.site || "—"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="secondary">{currentPorts.length} بورت</Badge>
                  <Badge className="bg-fiber/15 text-fiber">{usedPorts} مستخدم</Badge>
                  <Badge variant="outline">
                    {currentPorts.length - usedPorts - disabledPorts} متاح
                  </Badge>
                  {disabledPorts ? (
                    <Badge variant="destructive">{disabledPorts} خارج الخدمة</Badge>
                  ) : null}
                </div>
                <div className="ms-auto flex items-center gap-2">
                  <OdfQrDialog odf={currentOdf} ports={currentPorts} />
                  <Button
                    size="sm"
                    className={perms.edit ? "" : "hidden"}
                    variant={linkMode ? "default" : "outline"}
                    onClick={() => {
                      setLinkMode(!linkMode);
                      setSelected([]);
                    }}
                  >
                    <Cable className="h-4 w-4" />
                    {linkMode ? "إنهاء وضع الربط" : "ربط بورتين"}
                  </Button>
                  {perms.edit ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setOdfDialog({ open: true, editing: true })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  ) : null}
                  {perms.delete ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmDeleteOdf(true)}
                      aria-label="حذف الـ ODF"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  ) : null}
                </div>
              </div>

              {linkMode ? (
                <p className="rounded-lg border border-signal/40 bg-signal/10 p-3 text-sm text-foreground">
                  اختر بورتين لإنشاء دائرة توصيل بينهما. المحدد: {selected.length}/2
                </p>
              ) : null}

              <Tabs defaultValue="grid">
                <TabsList>
                  <TabsTrigger value="grid">لوحة البورتات</TabsTrigger>
                  <TabsTrigger value="map">خريطة الدوائر ({filteredCircuits.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="grid" className="mt-4">
                  <div className="surface min-h-[320px] rounded-xl p-4">
                    <PortGrid
                      ports={currentPorts}
                      circuitByPort={circuitByPort}
                      portsById={portsById}
                      odfsById={odfsById}
                      linkMode={linkMode}
                      selected={selected}
                      matches={matches}
                      focusCircuitId={focusCircuitId}
                      portsPerRow={currentOdf.ports_per_row || 12}
                      onPortClick={handlePortClick}
                      onLinkClick={(circuit) =>
                        setCircuitDialog({
                          open: true,
                          circuit,
                          a: circuit.port_a_id,
                          b: circuit.port_b_id,
                        })
                      }
                    />
                  </div>
                </TabsContent>
                <TabsContent value="map" className="mt-4">
                  <CircuitMap
                    circuits={filteredCircuits}
                    portsById={portsById}
                    odfsById={odfsById}
                    onSelect={(c) =>
                      setCircuitDialog({
                        open: true,
                        circuit: c,
                        a: c.port_a_id,
                        b: c.port_b_id,
                      })
                    }
                  />
                </TabsContent>
              </Tabs>
            </>
          ) : (
            !isLoading && (
              <div className="rounded-xl border border-dashed border-border p-12 text-center">
                <h2 className="text-lg font-semibold">ابدأ بإضافة أول ODF</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  سيتم إنشاء البورتات تلقائيًا حسب العدد المختار.
                </p>
                {perms.edit ? (
                  <Button
                    className="mt-4"
                    onClick={() => setOdfDialog({ open: true, editing: false })}
                  >
                    <Plus className="h-4 w-4" /> إضافة ODF
                  </Button>
                ) : null}
              </div>
            )
          )}
        </section>
      </div>

      <AppFooter />

      <OdfDialog
        open={odfDialog.open}
        onOpenChange={(open) => setOdfDialog({ open, editing: open && odfDialog.editing })}
        odf={odfDialog.editing ? currentOdf : null}
        currentAdapterType={currentPorts[0]?.adapter_type}
        saving={saveOdf.isPending}
        onSubmit={(input) => saveOdf.mutate(input)}
      />

      <PortDialog
        port={portDialog}
        onOpenChange={(open) => !open && setPortDialog(null)}
        saving={savePort.isPending}
        readOnly={!perms.edit}
        onSubmit={(patch) => savePort.mutate(patch)}
      />

      <CircuitDialog
        open={circuitDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setCircuitDialog({ open: false, circuit: null, a: "", b: "" });
            setSelected([]);
          }
        }}
        circuit={circuitDialog.circuit}
        portAId={circuitDialog.a}
        portBId={circuitDialog.b}
        ports={portsById}
        odfs={odfsById}
        saving={saveCircuit.isPending}
        readOnly={!perms.edit}
        selectablePorts={currentPorts.filter(
          (p) => !p.is_disabled || p.id === circuitDialog.a || p.id === circuitDialog.b,
        )}
        busyPortIds={
          new Set(
            currentPorts
              .filter((p) => {
                const c = circuitByPort.get(p.id);
                return !!c && c.id !== circuitDialog.circuit?.id;
              })
              .map((p) => p.id),
          )
        }
        onSubmit={(input) => saveCircuit.mutate(input)}
        onDelete={
          perms.delete && circuitDialog.circuit
            ? () => {
                if (circuitDialog.circuit) removeCircuit.mutate(circuitDialog.circuit.id);
              }
            : undefined
        }
      />

      <AlertDialog open={confirmDeleteOdf} onOpenChange={setConfirmDeleteOdf}>
        <AlertDialogContent className="text-right">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف {currentOdf?.name}؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف {currentPorts.length} بورت و{" "}
              <span className="font-bold text-destructive">
                {affectedCircuits.length} دائرة
              </span>{" "}
              مرتبطة بهذا الإطار.
              {affectedCircuits.length ? (
                <span className="mt-2 block max-h-32 overflow-y-auto rounded-lg border border-border p-2 text-xs font-mono">
                  {affectedCircuits.map((c) => c.name).join("، ")}
                </span>
              ) : null}
              <span className="mt-2 block">
                الحذف مبدئي (soft delete) ويمكن استرجاعه من قاعدة البيانات.
              </span>
            </AlertDialogDescription>

          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogAction onClick={() => removeOdf.mutate()}>حذف</AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
