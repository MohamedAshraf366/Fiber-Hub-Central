import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { addDataRate, deleteDataRate, fetchDataRates } from "./api";

/** Manager-managed list of selectable circuit data rates. */
export function DataRatesPanel() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const rates = useQuery({ queryKey: ["data-rates"], queryFn: fetchDataRates });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["data-rates"] });

  const add = useMutation({
    mutationFn: async () => {
      const value = name.trim().toUpperCase();
      if (!value) throw new Error("أدخل معدل البيانات");
      await addDataRate(value);
    },
    onSuccess: () => {
      setName("");
      void invalidate();
      toast.success("تمت إضافة معدل البيانات");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (r: { id: string; label: string }) => deleteDataRate(r.id, r.label),
    onSuccess: () => {
      void invalidate();
      toast.success("تم حذف معدل البيانات");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="surface grid gap-3 rounded-xl p-4 sm:grid-cols-[1fr_auto]">
        <div className="grid gap-1">
          <Label htmlFor="dr-name">معدل بيانات جديد</Label>
          <Input
            id="dr-name"
            dir="ltr"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: 400G أو STM1"
          />
        </div>
        <Button className="self-end" disabled={add.isPending} onClick={() => add.mutate()}>
          <Plus className="h-4 w-4" /> إضافة
        </Button>
      </div>

      <div className="surface flex flex-wrap gap-2 rounded-xl p-4">
        {rates.isLoading && <span className="text-sm text-muted-foreground">جارٍ التحميل...</span>}
        {rates.data?.length === 0 && (
          <span className="text-sm text-muted-foreground">لا توجد معدلات مسجّلة بعد</span>
        )}
        {(rates.data ?? []).map((r) => (
          <Badge key={r.id} variant="secondary" className="gap-2 py-1.5 pr-2 text-sm">
            <span dir="ltr">{r.label}</span>
            <button
              type="button"
              aria-label={`حذف ${r.label}`}
              className="text-destructive"
              onClick={() => remove.mutate({ id: r.id, label: r.label })}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
