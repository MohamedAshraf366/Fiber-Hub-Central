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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ADAPTER_TYPES, type Port } from "./types";

type Props = {
  port: Port | null;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  readOnly?: boolean;
  onSubmit: (patch: {
    label: string;
    adapter_type: string;
    notes: string;
    is_disabled: boolean;
  }) => void;
};

export function PortDialog({ port, onOpenChange, saving, readOnly, onSubmit }: Props) {
  const [form, setForm] = useState({
    label: "",
    adapter_type: "SC/UPC",
    notes: "",
    is_disabled: false,
  });

  useEffect(() => {
    if (!port) return;
    setForm({
      label: port.label ?? "",
      adapter_type: port.adapter_type,
      notes: port.notes ?? "",
      is_disabled: port.is_disabled ?? false,
    });
  }, [port]);

  return (
    <Dialog open={port !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-right">
          <DialogTitle>بيانات البورت رقم {port?.number}</DialogTitle>
          <DialogDescription>عدّل الـ Label ونوع الـ Adapter والملاحظات.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="port-label">Label</Label>
            <Input
              id="port-label"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>نوع الـ Adapter</Label>
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
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="text-right">
                <Label htmlFor="port-disabled">البورت لا يعمل (Out of service)</Label>
                <p className="text-xs text-muted-foreground">
                  عند التفعيل سيظهر البورت باللون الأحمر.
                </p>
              </div>
              <Switch
                id="port-disabled"
                checked={form.is_disabled}
                onCheckedChange={(v) => setForm({ ...form, is_disabled: v })}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="port-notes">ملاحظات</Label>
            <Textarea
              id="port-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-start">
          {readOnly ? null : (
            <Button disabled={saving} onClick={() => onSubmit(form)}>
              {saving ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {readOnly ? "إغلاق" : "إلغاء"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
