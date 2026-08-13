import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Ban, Check, CheckCircle2, FileSpreadsheet, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { fetchActivity, logActivity } from "@/lib/activity";
import { ROLE_LABELS, type AppUser, type Role } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { AppFooter } from "@/components/odf/AppFooter";
import { UserEditDialog } from "@/components/odf/UserEditDialog";
import { DataRatesPanel } from "@/components/odf/DataRatesPanel";
import { BulkExport } from "@/components/odf/BulkExport";
import { fetchOdfData } from "@/components/odf/api";
import { markExported } from "@/lib/reminders";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "الإعدادات وسجل النشاط — Fiber Hub Central" },
      {
        name: "description",
        content: "إدارة المستخدمين والصلاحيات ومتابعة سجل الأنشطة داخل منصة إدارة الـ ODF.",
      },
      { property: "og:title", content: "الإعدادات وسجل النشاط — Fiber Hub Central" },
      {
        property: "og:description",
        content: "إدارة المستخدمين والصلاحيات وسجل الأنشطة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

const ROLES: Role[] = ["manager", "engineer", "technician"];

const ACTION_LABELS: Record<string, string> = {
  create: "إضافة",
  update: "تعديل",
  delete: "حذف",
  import: "استيراد",
  export: "تصدير",
  rename: "تغيير الاسم",
  role_change: "تغيير الصلاحية",
  block: "حظر",
  unblock: "إلغاء الحظر",
  login: "تسجيل دخول",
};

const ENTITY_LABELS: Record<string, string> = {
  odf: "إطار ODF",
  port: "بورت",
  circuit: "دائرة",
  user: "مستخدم",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ar-EG", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${Math.round(hours / 24)} يوم`;
}

function formatDetails(details: unknown) {
  if (!details || typeof details !== "object") return "—";
  const entries = Object.entries(details as Record<string, unknown>);
  if (!entries.length) return "—";
  return entries
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join(" · ");
}

async function fetchUsers(): Promise<AppUser[]> {
  const { data, error } = await supabase
    .from("app_users")
    .select("id, work_number, full_name, role, is_blocked, auth_user_id, email, phone")
    .order("work_number");
  if (error) throw error;
  return (data ?? []) as AppUser[];
}

function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { me, perms, isLoading } = useAuth();
  const [newUser, setNewUser] = useState({ work_number: "", full_name: "", role: "technician" });
  const [filter, setFilter] = useState("");
  const [logFilter, setLogFilter] = useState("");
  const [logAction, setLogAction] = useState("all");

  const users = useQuery({ queryKey: ["app-users"], queryFn: fetchUsers, enabled: perms.manage });
  const activity = useQuery({
    queryKey: ["activity"],
    queryFn: () => fetchActivity(),
    enabled: perms.manage,
  });
  const odfData = useQuery({
    queryKey: ["odf-data"],
    queryFn: fetchOdfData,
    enabled: perms.manage,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["app-users"] });
    void queryClient.invalidateQueries({ queryKey: ["activity"] });
  };

  const setRole = useMutation({
    mutationFn: async ({ user, role }: { user: AppUser; role: Role }) => {
      const res = await supabase.from("app_users").update({ role }).eq("id", user.id);
      if (res.error) throw res.error;
      if (user.auth_user_id) {
        const del = await supabase.from("user_roles").delete().eq("user_id", user.auth_user_id);
        if (del.error) throw del.error;
        const ins = await supabase
          .from("user_roles")
          .insert({ user_id: user.auth_user_id, role });
        if (ins.error) throw ins.error;
      }
      await logActivity("role_change", "user", user.id, user.full_name, { role });
    },
    onSuccess: () => {
      invalidate();
      toast.success("تم تحديث الصلاحية");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleBlock = useMutation({
    mutationFn: async (user: AppUser) => {
      const res = await supabase
        .from("app_users")
        .update({ is_blocked: !user.is_blocked })
        .eq("id", user.id);
      if (res.error) throw res.error;
      await logActivity(user.is_blocked ? "unblock" : "block", "user", user.id, user.full_name);
    },
    onSuccess: () => {
      invalidate();
      toast.success("تم تحديث حالة المستخدم");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addUser = useMutation({
    mutationFn: async () => {
      const work_number = newUser.work_number.trim();
      const full_name = newUser.full_name.trim();
      if (!work_number || !full_name) throw new Error("أدخل رقم العامل والاسم");
      const res = await supabase
        .from("app_users")
        .insert({ work_number, full_name, role: newUser.role as Role });
      if (res.error) throw res.error;
      await logActivity("create", "user", null, full_name, { work_number });
    },
    onSuccess: () => {
      setNewUser({ work_number: "", full_name: "", role: "technician" });
      invalidate();
      toast.success("تمت إضافة المستخدم");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renameUser = useMutation({
    mutationFn: async ({ user, full_name }: { user: AppUser; full_name: string }) => {
      const name = full_name.trim();
      if (name.length < 2) throw new Error("أدخل اسمًا صحيحًا");
      const res = await supabase.from("app_users").update({ full_name: name }).eq("id", user.id);
      if (res.error) throw res.error;
      await logActivity("rename", "user", user.id, name, { from: user.full_name });
    },
    onSuccess: () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("تم تحديث الاسم");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeUser = useMutation({
    mutationFn: async (user: AppUser) => {
      if (user.id === me?.id) throw new Error("لا يمكنك حذف حسابك الخاص");
      const res = await supabase.from("app_users").delete().eq("id", user.id);
      if (res.error) throw res.error;
      await logActivity("delete", "user", user.id, user.full_name);
    },
    onSuccess: () => {
      invalidate();
      toast.success("تم حذف المستخدم");
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const rows = useMemo(() => {
    const term = filter.trim().toLowerCase();
    const list = users.data ?? [];
    if (!term) return list;
    return list.filter((u) =>
      `${u.work_number} ${u.full_name} ${ROLE_LABELS[u.role]}`.toLowerCase().includes(term),
    );
  }, [users.data, filter]);

  const logActions = useMemo(
    () => Array.from(new Set((activity.data ?? []).map((a) => a.action))),
    [activity.data],
  );

  const logRows = useMemo(() => {
    const term = logFilter.trim().toLowerCase();
    return (activity.data ?? []).filter((a) => {
      if (logAction !== "all" && a.action !== logAction) return false;
      if (!term) return true;
      return `${a.full_name ?? ""} ${a.work_number ?? ""} ${a.entity} ${a.entity_name ?? ""} ${
        ACTION_LABELS[a.action] ?? a.action
      }`
        .toLowerCase()
        .includes(term);
    });
  }, [activity.data, logFilter, logAction]);

  if (isLoading) {
    return <main className="p-8 text-center text-muted-foreground">جارٍ التحميل...</main>;
  }

  if (!perms.manage) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-lg font-semibold">هذه الصفحة للمدير فقط</h1>
        <Button variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
          العودة للوحة التحكم
        </Button>
      </main>
    );
  }

  return (
    <main className="app-shell flex min-h-screen flex-col text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-4">
          <Button size="sm" variant="outline" asChild>
            <Link to="/dashboard">
              <ArrowRight className="h-4 w-4" /> لوحة التحكم
            </Link>
          </Button>
          <h1 className="truncate text-base font-bold sm:text-lg">الإعدادات وسجل النشاط</h1>
          <div className="ms-auto flex flex-wrap items-center gap-2">
            <BulkExport
              odfs={odfData.data?.odfs ?? []}
              ports={odfData.data?.ports ?? []}
              circuits={odfData.data?.circuits ?? []}
              email={me?.email ?? null}
              phone={me?.phone ?? null}
              onExported={() => {
                if (me) void markExported(me.id);
                void queryClient.invalidateQueries({ queryKey: ["export-reminder"] });
              }}
            />
            <Button size="sm" variant="outline" asChild>
              <Link to="/import-history">
                <FileSpreadsheet className="h-4 w-4" /> سجل الاستيراد
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">المستخدمون ({users.data?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="rates">معدلات البيانات</TabsTrigger>
            <TabsTrigger value="history">سجل الأنشطة</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4 space-y-4">
            <div className="surface grid gap-3 rounded-xl p-4 sm:grid-cols-[1fr_1fr_160px_auto]">
              <div className="grid gap-1">
                <Label htmlFor="wn">رقم العامل</Label>
                <Input
                  id="wn"
                  value={newUser.work_number}
                  onChange={(e) => setNewUser({ ...newUser, work_number: e.target.value })}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="fn">الاسم</Label>
                <Input
                  id="fn"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                />
              </div>
              <div className="grid gap-1">
                <Label>الصلاحية</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(v) => setNewUser({ ...newUser, role: v })}
                >
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
              <Button className="self-end" disabled={addUser.isPending} onClick={() => addUser.mutate()}>
                <Plus className="h-4 w-4" /> إضافة
              </Button>
            </div>

            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="بحث بالاسم أو رقم العامل..."
              className="max-w-xs"
            />

            <div className="surface overflow-x-auto rounded-xl">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رقم العامل</TableHead>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">الصلاحية</TableHead>
                    <TableHead className="text-right">التواصل</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono">{u.work_number}</TableCell>
                      <TableCell>
                        <EditableName
                          user={u}
                          onSave={(full_name) => renameUser.mutate({ user: u, full_name })}
                        />
                      </TableCell>

                      <TableCell>
                        <Select
                          value={u.role}
                          onValueChange={(v) => setRole.mutate({ user: u, role: v as Role })}
                        >
                          <SelectTrigger className="h-8 w-32">
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
                      </TableCell>
                      <TableCell className="text-xs" dir="ltr">
                        <div>{u.email ?? "—"}</div>
                        <div className="text-muted-foreground">{u.phone ?? "—"}</div>
                      </TableCell>
                      <TableCell>
                        {u.is_blocked ? (
                          <Badge variant="destructive">محظور</Badge>
                        ) : (
                          <Badge variant="secondary">
                            {u.auth_user_id ? "نشط" : "لم يسجّل دخول بعد"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <UserEditDialog user={u} />
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            aria-label={u.is_blocked ? "إلغاء الحظر" : "حظر"}
                            onClick={() => toggleBlock.mutate(u)}
                          >
                            {u.is_blocked ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Ban className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            aria-label="حذف المستخدم"
                            onClick={() => removeUser.mutate(u)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="rates" className="mt-4">
            <DataRatesPanel />
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                placeholder="بحث باسم المستخدم أو العنصر..."
                className="max-w-xs"
              />
              <Select value={logAction} onValueChange={setLogAction}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الإجراءات</SelectItem>
                  {logActions.map((a) => (
                    <SelectItem key={a} value={a}>
                      {ACTION_LABELS[a] ?? a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="secondary">{logRows.length} حركة</Badge>
            </div>

            <div className="surface overflow-x-auto rounded-xl">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاريخ والوقت</TableHead>
                    <TableHead className="text-right">المستخدم</TableHead>
                    <TableHead className="text-right">الإجراء</TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">العنصر</TableHead>
                    <TableHead className="text-right">تفاصيل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logRows.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        <div className="font-medium">{formatDateTime(a.created_at)}</div>
                        <div className="text-muted-foreground">{timeAgo(a.created_at)}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium">{a.full_name ?? "—"}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {a.work_number ?? "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            a.action === "delete"
                              ? "destructive"
                              : a.action === "create"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {ACTION_LABELS[a.action] ?? a.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{ENTITY_LABELS[a.entity] ?? a.entity}</TableCell>
                      <TableCell className="text-sm">{a.entity_name ?? "—"}</TableCell>
                      <TableCell className="max-w-[22rem] text-xs text-muted-foreground">
                        {formatDetails(a.details)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!logRows.length ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        لا يوجد نشاط مسجل بعد
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <AppFooter />
    </main>

  );
}

function EditableName({
  user,
  onSave,
}: {
  user: AppUser;
  onSave: (fullName: string) => void;
}) {
  const [value, setValue] = useState(user.full_name);
  useEffect(() => setValue(user.full_name), [user.full_name]);
  const dirty = value.trim() !== user.full_name;
  return (
    <div className="flex min-w-0 items-center gap-1">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && dirty) onSave(value);
        }}
        className="h-8 min-w-0"
        aria-label={`اسم ${user.work_number}`}
      />
      {dirty ? (
        <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => onSave(value)} aria-label="حفظ الاسم">
          <Check className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
