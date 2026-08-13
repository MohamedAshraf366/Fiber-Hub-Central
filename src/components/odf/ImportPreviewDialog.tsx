import { useEffect, useState } from "react";
import type React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PAIRING_LABELS, type ImportPreview, type PairingRule } from "./sheet";

type Props = {
  preview: ImportPreview | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (preview: ImportPreview) => void;
  onRuleChange: (rule: PairingRule) => void;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function ImportPreviewDialog({ preview, onOpenChange, onConfirm, onRuleChange }: Props) {
  const [ackDuplicates, setAckDuplicates] = useState(false);
  const hasDuplicates = !!preview && (preview.duplicateOdfName || preview.duplicateCircuits.length > 0);

  useEffect(() => {
    if (!preview) setAckDuplicates(false);
  }, [preview]);

  return (
    <Dialog open={!!preview} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto text-right">
        <DialogHeader>
          <DialogTitle>مراجعة الملف قبل الاستيراد</DialogTitle>
          <DialogDescription>{preview?.fileName}</DialogDescription>
        </DialogHeader>

        {preview ? (
          <div className="space-y-2">
            <Row label="اسم الإطار (ODF)" value={preview.odfName} />
            <Row
              label="عمود البورت المكتشف"
              value={
                preview.portHeader ? (
                  <span className="inline-flex items-center gap-1 text-signal">
                    <CheckCircle2 className="h-4 w-4" /> {preview.portHeader}
                  </span>
                ) : (
                  <span className="text-destructive">غير موجود</span>
                )
              }
            />
            <Row
              label="عمود رقم الدائرة المكتشف"
              value={
                preview.circuitHeader ? (
                  <span className="inline-flex items-center gap-1 text-signal">
                    <CheckCircle2 className="h-4 w-4" /> {preview.circuitHeader}
                  </span>
                ) : (
                  <span className="text-muted-foreground">غير موجود</span>
                )
              }
            />
            <Row label="عدد البورتات" value={preview.portCount} />
            <Row label="عدد الدوائر" value={preview.circuitCount} />
            <Row label="صفوف الملف" value={`${preview.totalRows} (متجاهل: ${preview.skippedRows})`} />

            <div className="grid gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
              <Label className="text-xs text-muted-foreground">قاعدة ربط البورتات</Label>
              <Select value={preview.rule} onValueChange={(v) => onRuleChange(v as PairingRule)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PAIRING_LABELS) as PairingRule[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {PAIRING_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                المُطبَّق: {PAIRING_LABELS[preview.appliedRule]}
              </p>
            </div>

            {preview.headers.length ? (
              <div className="flex flex-wrap gap-1 pt-1">
                {preview.headers.map((h) => (
                  <Badge key={h} variant="secondary" className="font-normal">
                    {h}
                  </Badge>
                ))}
              </div>
            ) : null}

            {preview.warnings.length ? (
              <ul className="space-y-1 rounded-lg border border-fiber/40 bg-fiber/10 p-3 text-xs">
                {preview.warnings.map((w) => (
                  <li key={w} className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {hasDuplicates ? (
              <div className="space-y-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs">
                <p className="font-semibold text-destructive">تنبيه تكرار</p>
                {preview.duplicateOdfName ? (
                  <p>يوجد إطار بنفس الاسم «{preview.odfName}».</p>
                ) : null}
                {preview.duplicateCircuits.length ? (
                  <p className="font-mono">
                    أرقام دوائر مكررة: {preview.duplicateCircuits.slice(0, 15).join("، ")}
                    {preview.duplicateCircuits.length > 15 ? " …" : ""}
                  </p>
                ) : null}
                <label className="flex items-center gap-2 pt-1">
                  <Checkbox
                    checked={ackDuplicates}
                    onCheckedChange={(v) => setAckDuplicates(v === true)}
                  />
                  <span>أنا متأكد وأوافق على المتابعة مع التكرار</span>
                </label>
              </div>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            disabled={!preview || !preview.portCount || (hasDuplicates && !ackDuplicates)}
            onClick={() => preview && onConfirm(preview)}
          >
            استيراد {preview?.portCount ?? 0} بورت
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}