import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { adminUpdateUser } from "@/lib/auth.functions";
import { logActivity } from "@/lib/activity";
import { ROLE_LABELS, type AppUser, type Role } from "@/lib/auth";

const ROLES: Role[] = ["manager", "engineer", "technician"];

/** Manager-only full edit of another account, including work number and password. */
export function UserEditDialog({ user }: { user: AppUser }) {
  const queryClient = useQueryClient();
  const update = useServerFn(adminUpdateUser);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    work_number: user.work_number,
    full_name: user.full_name,
    role: user.role as Role,
    email: user.email ?? "",
    phone: user.phone ?? "",
    is_blocked: user.is_blocked,
    password: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      work_number: user.work_number,
      full_name: user.full_name,
      role: user.role,
      email: user.email ?? "",
      phone: user.phone ?? "",
      is_blocked: user.is_blocked,
      password: "",
    });
  }, [open, user]);

  const save = useMutation({
    mutationFn: async () => {
      await update({
        data: {
          user_id: user.id,
          work_number: form.work_number.trim(),
          full_name: form.full_name.trim(),
          role: form.role,
          is_blocked: form.is_blocked,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          ...(form.password ? { password: form.password } : {}),
        },
      });
      await logActivity("update", "user", user.id, form.full_name.trim(), {
        work_number: form.work_number.trim(),
        role: form.role,
        password_changed: form.password ? "yes" : "no",
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["app-users"] });
      void queryClient.invalidateQueries({ queryKey: ["activity"] });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      setOpen(false);
      toast.success("تم تحديث بيانات المستخدم");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="outline" className="h-8 w-8" aria-label="تعديل المستخدم">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="text-right sm:max-w-lg">
        <DialogHeader className="text-right">
          <DialogTitle>تعديل بيانات {user.full_name}</DialogTitle>
          <DialogDescription>
            يمكن للمدير تعديل رقم العامل وكلمة المرور والصلاحية وبيانات التواصل.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="eu-wn">رقم العامل</Label>
            <Input
              id="eu-wn"
              dir="ltr"
              value={form.work_number}
              onChange={(e) => setForm({ ...form, work_number: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="eu-name">الاسم</Label>
            <Input
              id="eu-name"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>الصلاحية</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="eu-pass">كلمة مرور جديدة (اختياري)</Label>
            <Input
              id="eu-pass"
              dir="ltr"
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="اتركها فارغة للإبقاء عليها"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="eu-email">البريد الإلكتروني</Label>
            <Input
              id="eu-email"
              dir="ltr"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="eu-phone">رقم الهاتف</Label>
            <Input
              id="eu-phone"
              dir="ltr"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+201234567890"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/70 p-3 sm:col-span-2">
            <Label htmlFor="eu-block">حظر المستخدم</Label>
            <Switch
              id="eu-block"
              checked={form.is_blocked}
              onCheckedChange={(v) => setForm({ ...form, is_blocked: v })}
            />
          </div>
        </div>
        <DialogFooter className="sm:justify-start">
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "جارٍ الحفظ..." : "حفظ التعديلات"}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
