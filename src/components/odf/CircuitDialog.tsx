import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { fetchDataRates, uploadCircuitFile, type CircuitInput } from "./api";
import { toast } from "sonner";
import { endpointLabel } from "./CircuitInfo";
import { DEFAULT_DATA_RATES, type Circuit, type Odf, type Port } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  circuit: Circuit | null;
  portAId: string;
  portBId: string;
  ports: Map<string, Port>;
  odfs: Map<string, Odf>;
  saving: boolean;
  readOnly?: boolean;
  /** Ports that can be picked as an endpoint (free ports + the current ends). */
  selectablePorts?: Port[];
  /** Ports already used by another circuit — picking them is blocked. */
  busyPortIds?: Set<string>;
  onSubmit: (input: CircuitInput) => void;
  onDelete?: (() => void) | undefined;
};

export function CircuitDialog({
  open,
  onOpenChange,
  circuit,
  portAId,
  portBId,
  ports,
  odfs,
  saving,
  readOnly,
  selectablePorts,
  busyPortIds,
  onSubmit,
  onDelete,
}: Props) {
  const [form, setForm] = useState<CircuitInput>({
    name: "",
    port_a_id: portAId,
    port_b_id: portBId,
    service_type: "",
    data_rate: "",
    device_a: "",
    device_b: "",
    cable_id: "",
    attenuation_db: "",
    installed_on: "",
    notes: "",
    attachment_url: "",
    attachment_name: "",
  });
  const [uploading, setUploading] = useState(false);
  const [busyWarning, setBusyWarning] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rates = useQuery({ queryKey: ["data-rates"], queryFn: fetchDataRates });
  const rateOptions = (rates.data ?? []).map((r) => r.label);
  const options = rateOptions.length ? rateOptions : DEFAULT_DATA_RATES;
  const rateList =
    form.data_rate && !options.includes(form.data_rate) ? [form.data_rate, ...options] : options;

  useEffect(() => {
    if (!open) return;
    setForm({
      name: circuit?.name ?? "",
      port_a_id: portAId,
      port_b_id: portBId,
      service_type: circuit?.service_type ?? "",
      data_rate: circuit?.data_rate ?? "",
      device_a: circuit?.device_a ?? "",
      device_b: circuit?.device_b ?? "",
      cable_id: circuit?.cable_id ?? "",
      attenuation_db:
        circuit?.attenuation_db === null || circuit?.attenuation_db === undefined
          ? ""
          : String(circuit.attenuation_db),
      installed_on: circuit?.installed_on ?? "",
      notes: circuit?.notes ?? "",
      attachment_url: circuit?.attachment_url ?? "",
      attachment_name: circuit?.attachment_name ?? "",
    });
    setBusyWarning(null);
  }, [open, circuit, portAId, portBId]);

  const endpointOptions = (selectablePorts ?? []).slice().sort((a, b) => a.number - b.number);
  const isBusy = (id: string) =>
    !!busyPortIds?.has(id) && id !== portAId && id !== portBId;
  const portSelect = (which: "port_a_id" | "port_b_id", label: string) => {
    const value = form[which];
    const list = endpointOptions.some((p) => p.id === value)
      ? endpointOptions
      : [...(ports.get(value) ? [ports.get(value)!] : []), ...endpointOptions];
    return (
      <div className="grid gap-2">
        <Label>{label}</Label>
        <Select
          value={value}
          onValueChange={(v) => {
            const port = ports.get(v);
            if (isBusy(v)) {
              setBusyWarning(
                `البورت ${port?.number ?? ""} مرتبط بدائرة أخرى — لا يمكن استخدامه. اختر بورتًا متاحًا أو افصل دائرته أولًا.`,
              );
              return;
            }
            const other = which === "port_a_id" ? form.port_b_id : form.port_a_id;
            if (v === other) {
              setBusyWarning("لا يمكن اختيار نفس البورت للطرفين.");
              return;
            }
            setBusyWarning(null);
            setForm({ ...form, [which]: v });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="اختر البورت" />
          </SelectTrigger>
          <SelectContent>
            {list.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {`بورت ${p.number}${p.label ? ` — ${p.label}` : ""}${isBusy(p.id) ? " (مشغول)" : ""}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadCircuitFile(file);
      setForm((prev) => ({ ...prev, attachment_url: res.url, attachment_name: res.name }));
    } catch {
      toast.error("تعذّر رفع الملف");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-right">
          <DialogTitle>{circuit ? "تعديل الدائرة" : "إنشاء دائرة توصيل"}</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {endpointLabel(portAId, ports, odfs)}
            <span className="mx-2 text-fiber">↔</span>
            {endpointLabel(portBId, ports, odfs)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {!readOnly && endpointOptions.length ? (
            <div className="grid gap-2">
              <div className="grid grid-cols-2 gap-4">
                {portSelect("port_a_id", "البورت A")}
                {portSelect("port_b_id", "البورت B")}
              </div>
              {busyWarning ? (
                <p className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{busyWarning}</span>
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="cir-name">اسم الدائرة</Label>
            <Input
              id="cir-name"
              value={form.name}
              placeholder="CIR-METRO-001"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cir-service">نوع الخدمة</Label>
              <Input
                id="cir-service"
                value={form.service_type}
                onChange={(e) => setForm({ ...form, service_type: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cir-cable">Cable ID</Label>
              <Input
                id="cir-cable"
                value={form.cable_id}
                onChange={(e) => setForm({ ...form, cable_id: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>معدل البيانات (Data Rate)</Label>
              <Select
                value={form.data_rate || "none"}
                onValueChange={(v) => setForm({ ...form, data_rate: v === "none" ? "" : v })}
              >
                <SelectTrigger id="cir-rate">
                  <SelectValue placeholder="اختر معدل البيانات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— بدون —</SelectItem>
                  {rateList.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cir-dev-a">الطرف A</Label>
              <Input
                id="cir-dev-a"
                value={form.device_a}
                onChange={(e) => setForm({ ...form, device_a: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cir-dev-b">الطرف B</Label>
              <Input
                id="cir-dev-b"
                value={form.device_b}
                onChange={(e) => setForm({ ...form, device_b: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cir-att">Attenuation (dB)</Label>
              <Input
                id="cir-att"
                inputMode="decimal"
                value={form.attenuation_db}
                onChange={(e) => setForm({ ...form, attenuation_db: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cir-date">تاريخ التركيب</Label>
              <Input
                id="cir-date"
                type="date"
                value={form.installed_on}
                onChange={(e) => setForm({ ...form, installed_on: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cir-notes">ملاحظات</Label>
            <Textarea
              id="cir-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label>مرفق (صورة أو ملف)</Label>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
            {form.attachment_url ? (
              <div className="flex items-center gap-2 rounded-md border border-border p-2 text-xs">
                <Paperclip className="h-3.5 w-3.5 text-fiber" />
                <a
                  href={form.attachment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 truncate font-mono text-foreground underline"
                >
                  {form.attachment_name || "ملف مرفق"}
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setForm({ ...form, attachment_url: "", attachment_name: "" })}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Paperclip className="ms-2 h-4 w-4" />
                {uploading ? "جارٍ الرفع..." : "إرفاق صورة أو ملف"}
              </Button>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-start">
          {readOnly ? null : (
            <Button
              disabled={!form.name.trim() || saving || uploading}
              onClick={() => onSubmit(form)}
            >
              {saving ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {readOnly ? "إغلاق" : "إلغاء"}
          </Button>
          {circuit && onDelete ? (
            <Button variant="destructive" onClick={onDelete}>
              فصل الدائرة
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
