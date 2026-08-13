import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { adapterBreakdown } from "@/components/odf/qr";
import { ADAPTER_DOT, MOUNT_LABELS, type Circuit, type Odf, type Port } from "@/components/odf/types";

async function fetchOdf(id: string) {
  const [odfRes, portsRes] = await Promise.all([
    supabase.from("odfs").select("*").eq("id", id).maybeSingle(),
    supabase.from("ports").select("*").eq("odf_id", id).eq("status", "active").order("number"),
  ]);
  if (odfRes.error) throw odfRes.error;
  const ports = (portsRes.data ?? []) as Port[];
  const ids = ports.map((p) => p.id);
  let circuits: Circuit[] = [];
  if (ids.length) {
    const cr = await supabase
      .from("circuits")
      .select("*")
      .eq("status", "active")
      .or(`port_a_id.in.(${ids.join(",")}),port_b_id.in.(${ids.join(",")})`);
    circuits = (cr.data ?? []) as Circuit[];
  }
  return { odf: (odfRes.data as Odf | null) ?? null, ports, circuits };
}

function OdfPublicView() {
  const { id } = Route.useParams();
  const [q, setQ] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["odf-qr", id],
    queryFn: () => fetchOdf(id),
  });

  if (isLoading) return <p className="p-8 text-center text-muted-foreground">جارٍ التحميل…</p>;
  if (error)
    return (
      <div className="p-8 text-center">
        <p className="mb-2 font-semibold">تحتاج لتسجيل الدخول لعرض بيانات الإطار.</p>
        <Link to="/" className="text-primary underline">
          تسجيل الدخول
        </Link>
      </div>
    );
  if (!data?.odf) return <p className="p-8 text-center">الإطار غير موجود.</p>;

  const { odf, ports, circuits } = data;
  const portName = (pid: string) => {
    const p = ports.find((x) => x.id === pid);
    return p ? `P${p.number}${p.label ? ` (${p.label})` : ""}` : "—";
  };
  const term = q.trim().toLowerCase();
  const shown = term
    ? circuits.filter((c) =>
        [c.name, c.data_rate, c.device_a, c.device_b, portName(c.port_a_id), portName(c.port_b_id)]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term)),
      )
    : circuits;

  return (
    <main dir="rtl" className="mx-auto max-w-3xl p-6">
      <h1 className="font-mono text-2xl font-bold">{odf.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {odf.site ?? "—"} · {MOUNT_LABELS[odf.mount_type] ?? odf.mount_type}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="secondary">{ports.length || odf.port_count} بورت</Badge>
        <Badge variant="secondary">{circuits.length} دائرة</Badge>
        {adapterBreakdown(ports).map((t) => (
          <Badge key={t.type} variant="outline" className="gap-1 font-mono">
            <span className={`h-2 w-2 rounded-full ${ADAPTER_DOT[t.kind]}`} />
            {t.type} × {t.count}
          </Badge>
        ))}
      </div>

      <div className="mt-6 mb-2 flex flex-wrap items-center gap-2">
        <h2 className="font-semibold">الدوائر</h2>
        <Badge variant="outline">{shown.length}</Badge>
        <div className="relative ms-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute end-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث برقم الدائرة أو البورت…"
            className="pe-8 ps-8 text-right"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="مسح البحث"
              className="absolute start-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-right text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-2">الدائرة</th>
              <th className="p-2">A</th>
              <th className="p-2">B</th>
              <th className="p-2">المعدل</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-2 font-mono">
                  <Link
                    to="/dashboard"
                    search={{ circuit: c.id }}
                    className="text-primary underline decoration-dotted hover:no-underline"
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="p-2 font-mono">{portName(c.port_a_id)}</td>
                <td className="p-2 font-mono">{portName(c.port_b_id)}</td>
                <td className="p-2">{c.data_rate ?? "—"}</td>
              </tr>
            ))}
            {!shown.length && (
              <tr>
                <td colSpan={4} className="p-3 text-center text-muted-foreground">
                  لا توجد دوائر مطابقة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        هذه الصفحة تُقرأ من قاعدة البيانات مباشرة — رمز QR المطبوع يبقى صالحًا بعد أي تعديل. اضغط على
        رقم الدائرة للانتقال إلى موقعها داخل الإطار مع إبرازها.
      </p>
    </main>
  );
}

export const Route = createFileRoute("/odf/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "بيانات إطار ODF — تحديث مباشر" },
      {
        name: "description",
        content: "عرض مباشر لبيانات إطار التوزيع الضوئي: البورتات وأنواعها والدوائر المرتبطة.",
      },
      { property: "og:title", content: "بيانات إطار ODF — تحديث مباشر" },
      {
        property: "og:description",
        content: "امسح رمز QR للإطار لعرض أحدث البورتات والدوائر دون طباعة رمز جديد.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OdfPublicView,
});
