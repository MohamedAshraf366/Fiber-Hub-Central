import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppFooter } from "@/components/odf/AppFooter";

export const Route = createFileRoute("/_authenticated/import-history")({
  head: () => ({
    meta: [
      { title: "سجل الاستيراد — Fiber Hub Central" },
      {
        name: "description",
        content: "سجل عمليات استيراد ملفات الأطر الضوئية: وقت الرفع وعدد الصفوف المضافة والأخطاء.",
      },
      { property: "og:title", content: "سجل الاستيراد — Fiber Hub Central" },
      {
        property: "og:description",
        content: "متابعة كل عمليات رفع ملفات ODF وعدد البورتات والدوائر المضافة والأخطاء.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImportHistoryPage,
});

type ImportDetails = {
  ports?: number;
  circuits?: number;
  file?: string | null;
  port_header?: string | null;
  circuit_header?: string | null;
  skipped_rows?: number;
  total_rows?: number;
  warnings?: string[];
  error?: string;
};

type ImportRow = {
  id: string;
  action: string;
  entity_name: string | null;
  full_name: string | null;
  work_number: string | null;
  created_at: string;
  details: ImportDetails | null;
};

async function fetchImports(): Promise<ImportRow[]> {
  const { data, error } = await supabase
    .from("activity_log")
    .select("id, action, entity_name, full_name, work_number, created_at, details")
    .in("action", ["import", "import_failed"])
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as ImportRow[];
}

function ImportHistoryPage() {
  const { perms } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["import-history"],
    queryFn: fetchImports,
    enabled: perms.manage,
  });

  return (
    <main className="app-shell flex min-h-screen flex-col px-4 py-6 text-foreground">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-fiber/15 text-fiber ring-1 ring-fiber/25">
            <FileSpreadsheet className="h-5 w-5" />
          </span>
          <div className="me-auto">
            <h1 className="text-lg font-bold">سجل الاستيراد</h1>
            <p className="text-xs text-muted-foreground">
              كل ملف تم رفعه، عدد البورتات والدوائر المضافة، والأخطاء إن وجدت.
            </p>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link to="/dashboard">
              <ArrowRight className="h-4 w-4" /> رجوع
            </Link>
          </Button>
        </div>

        {!perms.manage ? (
          <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            سجل الاستيراد متاح للمديرين فقط.
          </p>
        ) : error ? (
          <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-sm">
            {(error as Error).message}
          </p>
        ) : isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">جارٍ التحميل…</p>
        ) : (data?.length ?? 0) === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            لا توجد عمليات استيراد بعد.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الملف</TableHead>
                  <TableHead className="text-right">الإطار</TableHead>
                  <TableHead className="text-right">بورتات</TableHead>
                  <TableHead className="text-right">دوائر</TableHead>
                  <TableHead className="text-right">متجاهل</TableHead>
                  <TableHead className="text-right">المستخدم</TableHead>
                  <TableHead className="text-right">الحالة / الأخطاء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((row) => {
                  const d = row.details ?? {};
                  const failed = row.action === "import_failed";
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {new Date(row.created_at).toLocaleString("ar-EG")}
                      </TableCell>
                      <TableCell className="text-xs">{d.file ?? "—"}</TableCell>
                      <TableCell className="text-xs font-medium">{row.entity_name ?? "—"}</TableCell>
                      <TableCell className="text-xs">{failed ? "—" : (d.ports ?? 0)}</TableCell>
                      <TableCell className="text-xs">{failed ? "—" : (d.circuits ?? 0)}</TableCell>
                      <TableCell className="text-xs">{d.skipped_rows ?? 0}</TableCell>
                      <TableCell className="text-xs">
                        {row.full_name ?? "—"}
                        {row.work_number ? ` (${row.work_number})` : ""}
                      </TableCell>
                      <TableCell className="text-xs">
                        {failed ? (
                          <span className="text-destructive">{d.error ?? "فشل الاستيراد"}</span>
                        ) : d.warnings?.length ? (
                          <ul className="space-y-0.5 text-muted-foreground">
                            {d.warnings.map((w) => (
                              <li key={w}>• {w}</li>
                            ))}
                          </ul>
                        ) : (
                          <Badge variant="secondary">تم بنجاح</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <AppFooter />
    </main>
  );
}