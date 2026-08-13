import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function ChangePasswordDialog() {
  const { me } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(me?.full_name ?? "");
  }, [me?.full_name, open]);

  async function saveName() {
    const name = fullName.trim();
    if (name.length < 2) {
      toast.error("أدخل اسمًا صحيحًا");
      return;
    }
    if (!me) return;
    setSavingName(true);
    const { error } = await supabase.from("app_users").update({ full_name: name }).eq("id", me.id);
    setSavingName(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["me"] });
    await queryClient.invalidateQueries({ queryKey: ["app-users"] });
    toast.success("تم تحديث الاسم");
  }

  async function submit() {
    if (password.length < 6) {
      toast.error("كلمة المرور يجب ألا تقل عن 6 خانات");
      return;
    }
    if (password !== confirm) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم تغيير كلمة المرور");
    setPassword("");
    setConfirm("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" aria-label="حسابي">
          <UserCog className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="text-right">
          <DialogTitle>حسابي</DialogTitle>
          <DialogDescription>
            يمكنك تعديل اسمك وكلمة المرور الخاصة بك فقط.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 text-right">
          <div className="grid gap-2">
            <Label htmlFor="my-name">الاسم</Label>
            <div className="flex gap-2">
              <Input
                id="my-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <Button variant="secondary" disabled={savingName} onClick={saveName}>
                {savingName ? "..." : "حفظ"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              رقم العامل: <span className="font-mono">{me?.work_number}</span>
            </p>
          </div>
          <Separator />
          <div className="grid gap-2">
            <Label htmlFor="new-pass">كلمة المرور الجديدة</Label>
            <Input
              id="new-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm-pass">تأكيد كلمة المرور</Label>
            <Input
              id="confirm-pass"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-start">
          <Button disabled={saving} onClick={submit}>
            {saving ? "جارٍ الحفظ..." : "تغيير كلمة المرور"}
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
