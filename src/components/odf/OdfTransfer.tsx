import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { OdfExport } from "./api";
import {
  analyzeSheet,
  buildPayload,
  download,
  downloadTemplate,
  safeName,
  tableRows,
  worksheetToRows,
} from "./sheet";
import type { ImportPreview, PairingRule } from "./sheet";
import { ImportPreviewDialog } from "./ImportPreviewDialog";
import type { Circuit, Odf, Port } from "./types";

type Props = {
  odf: Odf | null;
  ports: Port[];
  circuits: Circuit[];
  onImport: (payload: OdfExport, meta?: { fileName: string; preview?: ImportPreview }) => void;
  canImport?: boolean;
  /** Used to warn about duplicate ODF names / circuit numbers before import. */
  existingOdfNames?: string[];
  existingCircuitNames?: string[];
};

export function OdfTransfer({
  odf,
  ports,
  circuits,
  onImport,
  canImport = true,
  existingOdfNames = [],
  existingCircuitNames = [],
}: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const existing = { odfNames: existingOdfNames, circuitNames: existingCircuitNames };

  const run = async (kind: "json" | "csv" | "xlsx" | "pdf") => {
    if (!odf) return;
    const payload = buildPayload(odf, ports, circuits);
    const base = safeName(odf.name);

    if (kind === "json") {
      download(
        new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
        `${base}.json`,
      );
      return;
    }

    const rows = tableRows(payload);
    if (kind === "csv" || kind === "xlsx") {
      const XLSX = await import("xlsx");
      const sheet = XLSX.utils.json_to_sheet(rows);
      if (kind === "csv") {
        const csv = "\uFEFF" + XLSX.utils.sheet_to_csv(sheet);
        download(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${base}.csv`);
      } else {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, sheet, "ODF");
        const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
        download(
          new Blob([out], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
          `${base}.xlsx`,
        );
      }
      return;
    }

    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(`ODF: ${odf.name}`, 14, 14);
    doc.setFontSize(10);
    doc.text(
      `Site: ${odf.site ?? "-"} | Ports: ${payload.ports.length} | Circuits: ${payload.circuits.length}`,
      14,
      21,
    );
    const head = Object.keys(rows[0] ?? { Port: "" });
    autoTable(doc, {
      startY: 26,
      head: [head],
      body: rows.map((r) => head.map((h) => String((r as Record<string, unknown>)[h] ?? ""))),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 100, 190] },
    });
    doc.save(`${base}.pdf`);
  };

  const handleFile = async (file: File) => {
    try {
      const base = file.name.replace(/\.[^.]+$/, "");
      if (/\.json$/i.test(file.name)) {
        const parsed = JSON.parse(await file.text()) as OdfExport;
        if (!parsed?.odf?.name || !Array.isArray(parsed.ports)) throw new Error("ملف غير صالح");
        onImport(parsed, { fileName: file.name });
        return;
      }
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const first = wb.SheetNames[0];
      const sheet = first ? wb.Sheets[first] : undefined;
      if (!sheet) throw new Error("الملف لا يحتوي على أي ورقة بيانات");
      const parsed = worksheetToRows(sheet, XLSX);
      setPreview(analyzeSheet(parsed, base, file.name, "auto", existing));
    } catch (e) {
      toast.error((e as Error).message || "تعذّر قراءة الملف");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" disabled={!odf}>
            <Download className="h-4 w-4" /> تصدير
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => run("json")}>JSON</DropdownMenuItem>
          <DropdownMenuItem onClick={() => run("csv")}>CSV</DropdownMenuItem>
          <DropdownMenuItem onClick={() => run("xlsx")}>Excel (xlsx)</DropdownMenuItem>
          <DropdownMenuItem onClick={() => run("pdf")}>PDF</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {canImport ? (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void downloadTemplate(odf?.name ?? "ODF-1")}
          >
            <FileSpreadsheet className="h-4 w-4" /> قالب فارغ
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> استيراد
          </Button>
        </>
      ) : null}
      <input
        ref={fileRef}
        type="file"
        accept=".json,.csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />

      <ImportPreviewDialog
        preview={preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
        onRuleChange={(rule: PairingRule) => {
          if (!preview) return;
          try {
            setPreview(
              analyzeSheet(preview.parsed, preview.fallbackName, preview.fileName, rule, existing),
            );
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
        onConfirm={(p) => {
          setPreview(null);
          onImport(p.payload, { fileName: p.fileName, preview: p });
        }}
      />
    </>
  );
}
