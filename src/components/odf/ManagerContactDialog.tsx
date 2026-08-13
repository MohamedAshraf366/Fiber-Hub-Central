import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { supabase } from "@/integrations/supabase/client";
import type { AppUser } from "@/lib/auth";

/** Managers must record an email + phone once so backup reminders can reach them. */
export function ManagerContactDialog({ me }: { me: AppUser | null }) {
  const queryClient = useQueryClient();
  const needed = !!me && me.role === "manager" && (!me.email || !me.phone);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!needed) return;
    setEmail(me?.email ?? "");
    setPhone(me?.phone ?? "");
    setOpen(true);
  }, [needed, me?.email, me?.phone]);

  const save = useMutation({
    mutationFn: async () => {
      const mail = email.trim();
      const tel = phone.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) throw new Error("أدخل بريدًا إلكترونيًا صحيحًا");
      if (tel.replace(/\D/g, "").length < 10) throw new Error("أدخل رقم هاتف صحيح مع كود الدولة");
      const res = await supabase
        .from("app_users")
        .update({ email: mail, phone: tel })
        .eq("id", me!.id);
      if (res.error) throw res.error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      void queryClient.invalidateQueries({ queryKey: ["app-users"] });
      setOpen(false);
      toast.success("تم حفظ بيانات التواصل");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!needed) return null;

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent className="text-right sm:max-w-md">
        <DialogHeader className="text-right">
          <DialogTitle>بيانات التواصل للمدير</DialogTitle>
          <DialogDescription>
            أدخل البريد الإلكتروني ورقم الهاتف (واتساب) لاستلام تذكير النسخة الأسبوعية وإرسال
            التقارير.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="mgr-email">البريد الإلكتروني</Label>
            <Input
              id="mgr-email"
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="mgr-phone">رقم الهاتف (واتساب)</Label>
            <Input
              id="mgr-phone"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+201234567890"
            />
          </div>
        </div>
        <DialogFooter className="sm:justify-start">
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "جارٍ الحفظ..." : "حفظ ومتابعة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
