import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { KeyRound, Waypoints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { provisionAccount } from "@/lib/auth.functions";
import { workNumberEmail } from "@/lib/auth";
import { ThemeToggle } from "@/components/odf/ThemeToggle";
import { AppFooter } from "@/components/odf/AppFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — Fiber Hub Central" },
      {
        name: "description",
        content:
          "سجّل الدخول برقم العامل لإدارة أطر التوزيع الضوئي ODF: البورتات، الدوائر، والتقارير.",
      },
      { property: "og:title", content: "تسجيل الدخول — Fiber Hub Central" },
      {
        property: "og:description",
        content: "الدخول إلى منصة إدارة أطر التوزيع الضوئي ODF برقم العامل.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

/** Turns raw backend errors into clear Arabic messages for the user. */
function friendlyAuthError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("already been registered") || m.includes("already registered"))
    return "هذا الحساب مُسجّل بالفعل — استخدم كلمة المرور الحالية، أو راجع المدير لإعادة التعيين.";
  if (m.includes("invalid login") || m.includes("invalid credentials"))
    return "رقم العامل أو كلمة المرور غير صحيحة";
  if (m.includes("unauthorized") || m.includes("access denied") || m.includes("forbidden"))
    return "لا تملك صلاحية الدخول — راجع المدير";
  if (m.includes("session")) return "انتهت الجلسة — سجّل الدخول من جديد";
  if (m.includes("rate limit") || m.includes("too many"))
    return "محاولات كثيرة — انتظر قليلًا ثم أعد المحاولة";
  if (m.includes("network") || m.includes("fetch"))
    return "تعذّر الاتصال بالخادم — تحقّق من الإنترنت وأعد المحاولة";
  return raw || "تعذّر تسجيل الدخول";
}

function LoginPage() {
  const navigate = useNavigate();
  const provision = useServerFn(provisionAccount);
  const [workNumber, setWorkNumber] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data, error }) => {
      // A stale token from a deleted session returns 403 — clear it silently.
      if (error) {
        void supabase.auth.signOut();
        return;
      }
      if (data.user) void navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const wn = workNumber.trim();
    if (!wn || !password) return;
    setBusy(true);
    try {
      // Drop any stale/invalid session before signing in.
      await supabase.auth.signOut();
      await provision({ data: { work_number: wn, password } });
      const { error } = await supabase.auth.signInWithPassword({
        email: workNumberEmail(wn),
        password,
      });
      if (error) throw new Error(friendlyAuthError(error.message));
      toast.success("تم تسجيل الدخول");
      void navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(friendlyAuthError((err as Error).message ?? ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell flex min-h-screen flex-col px-4 text-foreground">
      <div className="absolute end-4 top-4">
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center py-16">
        <div className="surface-raised w-full max-w-sm rounded-2xl p-6 sm:p-8">
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-fiber/15 text-fiber ring-1 ring-fiber/25">
              <Waypoints className="h-7 w-7" />
            </span>
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-brand-gradient">Fiber Hub</span> Central
            </h1>

          <p className="text-xs text-muted-foreground">
            سجّل الدخول برقم العامل الخاص بك للوصول إلى إدارة الـ ODF
          </p>
        </div>

        <form onSubmit={onSubmit} className="grid gap-4 text-right">
          <div className="grid gap-2">
            <Label htmlFor="work-number">رقم العامل</Label>
            <Input
              id="work-number"
              inputMode="numeric"
              autoComplete="username"
              value={workNumber}
              onChange={(e) => setWorkNumber(e.target.value)}
              placeholder="مثال: 114978"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="أول مرة: نفس رقم العامل"
              required
            />
          </div>
          <Button type="submit" disabled={busy}>
            <KeyRound className="h-4 w-4" />
            {busy ? "جارٍ الدخول..." : "دخول"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            في أول تسجيل دخول تكون كلمة المرور هي نفس رقم العامل، ويمكنك تغييرها لاحقًا من داخل
            النظام.
          </p>
        </form>
        </div>
      </div>
      <AppFooter />
    </main>
  );

}
