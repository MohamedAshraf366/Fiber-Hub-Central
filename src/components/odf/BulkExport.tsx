import { useState } from "react";
import { ChevronDown, DownloadCloud, Loader2, Mail, MessageCircle, QrCode, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buildPayload, download, safeName, tableRows } from "./sheet";
import { adapterBreakdown, odfQrUrl, qrDataUrl } from "./qr";
import type { Circuit, Odf, Port } from "./types";

type Props = {
  odfs: Odf[];
  ports: Port[];
  circuits: Circuit[];
  email?: string | null;
  phone?: string | null;
  onExported?: () => void;
};

const stamp = () => new Date().toISOString().slice(0, 10);

function payloadsOf(odfs: Odf[], ports: Port[], circuits: Circuit[]) {
  return odfs.map((odf) => {
    const own = ports.filter((p) => p.odf_id === odf.id);
    const ids = new Set(own.map((p) => p.id));
    const own_circuits = circuits.filter((c) => ids.has(c.port_a_id) || ids.has(c.port_b_id));
    return { odf, ports: own, circuits: own_circuits, payload: buildPayload(odf, own, own_circuits) };
  });
}

export function summaryText(odfs: Odf[], ports: Port[], circuits: Circuit[]) {
  const lines = payloadsOf(odfs, ports, circuits).map(
    (e) =>
      `• ${e.odf.name} (${e.odf.site ?? "—"}) — بورتات: ${e.ports.length} / دوائر: ${e.circuits.length}`,
  );
  return [
    `تقرير أطر التوزيع الضوئي ODF بتاريخ ${stamp()}`,
    `عدد الأطر: ${odfs.length} — إجمالي الدوائر: ${circuits.length}`,
    "",
    ...lines,
    "",
    "الملف المرفق يحتوي على كل إطار في ورقة منفصلة مع دوائره.",
  ].join("\n");
}

/** One workbook, one sheet per ODF plus a combined circuits sheet. */
export async function downloadAllWorkbook(odfs: Odf[], ports: Port[], circuits: Circuit[]) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  const all: Record<string, unknown>[] = [];
  for (const e of payloadsOf(odfs, ports, circuits)) {
    const rows = tableRows(e.payload);
    let sheetName = safeName(e.odf.name).slice(0, 28) || "ODF";
    let i = 2;
    while (used.has(sheetName)) sheetName = `${sheetName.slice(0, 26)}_${i++}`;
    used.add(sheetName);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheetName);
    for (const r of rows) if (r.Circuit) all.push({ ODF: e.odf.name, Site: e.odf.site ?? "", ...r });
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(all), "All Circuits");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  download(
    new Blob([out], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `ODF-ALL-${stamp()}.xlsx`,
  );
}

/** Full report: one PDF page per ODF with its QR code, stats and circuit table. */
export async function downloadAllWithQr(odfs: Odf[], ports: Port[], circuits: Circuit[]) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });
  let first = true;
  for (const e of payloadsOf(odfs, ports, circuits)) {
    if (!first) doc.addPage();
    first = false;
    const qr = await qrDataUrl(odfQrUrl(e.odf), 512);
    doc.setFontSize(14);
    doc.text(`ODF: ${e.odf.name}`, 14, 16);
    doc.setFontSize(10);
    doc.text(
      `Site: ${e.odf.site ?? "-"} | Ports: ${e.ports.length} | Circuits: ${e.circuits.length}`,
      14,
      23,
    );
    doc.text(
      `Types: ${adapterBreakdown(e.ports).map((t) => `${t.type} x${t.count}`).join(", ") || "-"}`,
      14,
      29,
    );
    doc.addImage(qr, "PNG", 240, 10, 40, 40);
    const rows = tableRows(e.payload);
    const head = Object.keys(rows[0] ?? { Port: "" });
    autoTable(doc, {
      startY: 54,
      head: [head],
      body: rows.map((r) => head.map((h) => String((r as Record<string, unknown>)[h] ?? ""))),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [127, 52, 233] },
    });
  }
  doc.save(`ODF-FULL-QR-${stamp()}.pdf`);
}

export function BulkExport({ odfs, ports, circuits, email, phone, onExported }: Props) {
  const [busy, setBusy] = useState(false);

  const entries = () => payloadsOf(odfs, ports, circuits);

  const downloadWorkbook = async () => {
    if (!odfs.length) {
      toast.error("لا توجد أطر لتصديرها");
      return;
    }
    setBusy(true);
    try {
      await downloadAllWorkbook(odfs, ports, circuits);
      onExported?.();
      toast.success("تم تنزيل كل الأطر والدوائر");
    } catch (e) {
      toast.error((e as Error).message || "تعذّر التصدير");
    } finally {
      setBusy(false);
    }
  };

  const downloadQrPack = async () => {
    if (!odfs.length) {
      toast.error("لا توجد أطر لتصديرها");
      return;
    }
    setBusy(true);
    try {
      await downloadAllWorkbook(odfs, ports, circuits);
      await downloadAllWithQr(odfs, ports, circuits);
      onExported?.();
      toast.success("تم تنزيل كل البيانات مع رموز QR");
    } catch (e) {
      toast.error((e as Error).message || "تعذّر التصدير");
    } finally {
      setBusy(false);
    }
  };

  /** A separate file per ODF, each containing that ODF's own circuits. */
  const downloadPerOdf = async () => {
    if (!odfs.length) {
      toast.error("لا توجد أطر لتصديرها");
      return;
    }
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      for (const e of entries()) {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tableRows(e.payload)), "ODF");
        const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
        download(
          new Blob([out], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
          `${safeName(e.odf.name)}-${stamp()}.xlsx`,
        );
        await new Promise((r) => setTimeout(r, 350));
      }
      onExported?.();
      toast.success(`تم تنزيل ${odfs.length} ملف (ملف لكل إطار)`);
    } catch (e) {
      toast.error((e as Error).message || "تعذّر التصدير");
    } finally {
      setBusy(false);
    }
  };

  const shareEmail = async () => {
    await downloadWorkbook();
    const to = (email ?? "").trim();
    const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
      `تقرير ODF — ${stamp()}`,
    )}&body=${encodeURIComponent(summaryText(odfs, ports, circuits))}`;
    window.location.href = url;
    toast.info("تم تنزيل الملف — أرفقه بالرسالة قبل الإرسال");
  };

  const shareWhatsapp = async () => {
    await downloadWorkbook();
    const digits = (phone ?? "").replace(/\D/g, "");
    const base = digits ? `https://wa.me/${digits}` : "https://wa.me/";
    window.open(`${base}?text=${encodeURIComponent(summaryText(odfs, ports, circuits))}`, "_blank");
    toast.info("تم تنزيل الملف — أرفقه في محادثة واتساب");
  };

  return (
    <div className="flex items-center gap-1 rounded-lg btn-brand p-0.5">
      <Button
        size="sm"
        variant="ghost"
        disabled={busy}
        onClick={() => void downloadWorkbook()}
        className="h-8 gap-2 rounded-md px-3 font-semibold text-primary-foreground hover:bg-background/15 hover:text-primary-foreground"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <DownloadCloud className="h-4 w-4" />
        )}
        تنزيل كل الأطر والدوائر
      </Button>
      <span className="h-5 w-px bg-background/30" aria-hidden />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            aria-label="خيارات التصدير"
            className="h-8 w-8 rounded-md px-0 text-primary-foreground hover:bg-background/15 hover:text-primary-foreground"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>تنزيل بضغطة واحدة</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => void downloadWorkbook()}>
          <DownloadCloud className="h-4 w-4" /> ملف واحد (ورقة لكل إطار)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void downloadPerOdf()}>
          <Send className="h-4 w-4" /> ملف منفصل لكل إطار
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void downloadQrPack()}>
          <QrCode className="h-4 w-4" /> كل البيانات + رموز QR (Excel + PDF)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>إرسال</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => void shareEmail()}>
          <Mail className="h-4 w-4" /> بريد إلكتروني {email ? `(${email})` : ""}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void shareWhatsapp()}>
          <MessageCircle className="h-4 w-4" /> واتساب {phone ? `(${phone})` : ""}
        </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
