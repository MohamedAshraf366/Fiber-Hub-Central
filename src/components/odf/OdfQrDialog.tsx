import { useEffect, useState } from "react";
import { Download, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { adapterBreakdown, downloadOdfQr, odfQrUrl, qrDataUrl } from "./qr";
import { ADAPTER_DOT, type Odf, type Port } from "./types";

type Props = { odf: Odf; ports: Port[] };

export function OdfQrDialog({ odf, ports }: Props) {
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const text = odfQrUrl(odf);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void qrDataUrl(text, 512).then((url) => {
      if (alive) setSrc(url);
    });
    return () => {
      alive = false;
    };
  }, [open, text]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" aria-label="رمز QR للإطار">
          <QrCode className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="text-right sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono">{odf.name} — رمز QR</DialogTitle>
          <DialogDescription>
            الرمز يفتح صفحة الإطار المباشرة — أي تعديل لاحق يظهر عند المسح بدون طباعة رمز جديد.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3">
          {src ? (
            <img
              src={src}
              alt={`رمز QR للإطار ${odf.name}`}
              className="h-56 w-56 rounded-xl border border-border bg-background p-2"
            />
          ) : (
            <div className="h-56 w-56 animate-pulse rounded-xl bg-muted" />
          )}
          <div className="flex flex-wrap justify-center gap-1.5">
            <Badge variant="secondary">{ports.length || odf.port_count} بورت</Badge>
            {adapterBreakdown(ports).map((t) => (
              <Badge key={t.type} variant="outline" className="gap-1 font-mono">
                <span className={`h-2 w-2 rounded-full ${ADAPTER_DOT[t.kind]}`} />
                {t.type} × {t.count}
              </Badge>
            ))}
          </div>
          <Button className="w-full" onClick={() => void downloadOdfQr(odf, ports)}>
            <Download className="h-4 w-4" /> تنزيل الرمز PNG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
