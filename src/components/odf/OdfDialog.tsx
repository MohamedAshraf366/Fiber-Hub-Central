import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ADAPTER_TYPES, type Odf } from "./types";
import type { OdfInput } from "./api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  odf: Odf | null;
  currentAdapterType?: string | undefined;
  saving: boolean;
  onSubmit: (input: OdfInput) => void;
};

const empty: OdfInput = {
  name: "",
  site: "",
  mount_type: "rack",
  port_count: 24,
  ports_per_row: 12,
  notes: "",
  adapter_type: "SC/UPC",
};

export function OdfDialog({ open, onOpenChange, odf, currentAdapterType, saving, onSubmit }: Props) {
  const [form, setForm] = useState<OdfInput>(empty);

  useEffect(() => {
    if (!open) return;
    setForm(
      odf
        ? {
            name: odf.name,
            site: odf.site ?? "",
            mount_type: odf.mount_type,
            port_count: odf.port_count,
            ports_per_row: odf.ports_per_row ?? 12,
            notes: odf.notes ?? "",
            adapter_type: currentAdapterType || "SC/UPC",
          }
        : empty,
    );
  }, [open, odf, currentAdapterType]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-right">
          <DialogTitle>{odf ? "تعديل الـ ODF" : "إضافة ODF جديد"}</DialogTitle>
          <DialogDescription>
            بيانات الإطار وعدد البورتات — البورتات تُنشأ تلقائيًا بالترقيم.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="odf-name">اسم الـ ODF</Label>
            <Input
              id="odf-name"
              value={form.name}
              placeholder="ODF-CORE-01"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="odf-site">الموقع / Site</Label>
            <Input
              id="odf-site"
              value={form.site}
              onChange={(e) => setForm({ ...form, site: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>نوع التركيب</Label>
              <Select
                value={form.mount_type}
                onValueChange={(v) => setForm({ ...form, mount_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rack">Rack Mount</SelectItem>
                  <SelectItem value="wall">Wall Mount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>عدد البورتات</Label>
              <Input
                id="odf-port-count"
                type="number"
                min={1}
                max={2000}
                inputMode="numeric"
                value={form.port_count}
                onChange={(e) =>
                  setForm({ ...form, port_count: Math.max(0, Number(e.target.value) || 0) })
                }
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>عدد البورتات في السطر الواحد</Label>
            <Input
              id="odf-ports-per-row"
              type="number"
              min={1}
              max={64}
              inputMode="numeric"
              value={form.ports_per_row}
              onChange={(e) =>
                setForm({ ...form, ports_per_row: Math.max(0, Number(e.target.value) || 0) })
              }
            />
            <p className="text-xs text-muted-foreground">أدخل أي رقم يناسب الإطار.</p>
          </div>
          <div className="grid gap-2">
            <Label>نوع الـ Adapter للبورتات الجديدة</Label>
            <Select
              value={form.adapter_type}
              onValueChange={(v) => setForm({ ...form, adapter_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADAPTER_TYPES.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="odf-notes">ملاحظات</Label>
            <Textarea
              id="odf-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-start">
          <Button
            disabled={!form.name.trim() || saving || form.port_count < 1 || form.ports_per_row < 1}
            onClick={() => onSubmit(form)}
          >
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
