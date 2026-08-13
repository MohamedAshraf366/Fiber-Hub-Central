import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlarmClock, DownloadCloud, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { dismissReminder, fetchReminder, isBackupDue } from "@/lib/reminders";
import type { AppUser } from "@/lib/auth";
import { summaryText } from "./BulkExport";
import type { Circuit, Odf, Port } from "./types";

type Props = {
  me: AppUser | null;
  odfs: Odf[];
  ports: Port[];
  circuits: Circuit[];
  onDownloadAll: () => void;
};

export function BackupReminder({ me, odfs, ports, circuits, onDownloadAll }: Props) {
  const queryClient = useQueryClient();
  const enabled = !!me && me.role === "manager";
  const reminder = useQuery({
    queryKey: ["export-reminder", me?.id],
    queryFn: () => fetchReminder(me!.id),
    enabled,
    refetchInterval: 60 * 60 * 1000,
  });

  const due = enabled && reminder.isSuccess && isBackupDue(reminder.data);

  const close = async () => {
    if (me) await dismissReminder(me.id);
    void queryClient.invalidateQueries({ queryKey: ["export-reminder"] });
  };

  const text = () =>
    `تذكير أسبوعي (الاثنين): تنزيل نسخة من كل أطر ODF والدوائر.\n\n${summaryText(odfs, ports, circuits)}`;

  return (
    <AlertDialog open={!!due}>
      <AlertDialogContent className="text-right">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlarmClock className="h-5 w-5 text-fiber" /> تذكير النسخة الأسبوعية
          </AlertDialogTitle>
          <AlertDialogDescription>
            كل يوم اثنين يجب تنزيل نسخة من جميع الأطر والدوائر والاحتفاظ بها. يمكنك أيضًا إرسال
            التذكير إلى بريدك أو واتساب.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-wrap gap-2 sm:justify-start">
          <Button
            onClick={() => {
              onDownloadAll();
              void close();
            }}
          >
            <DownloadCloud className="h-4 w-4" /> تنزيل الكل الآن
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const to = encodeURIComponent(me?.email ?? "");
              window.location.href = `mailto:${to}?subject=${encodeURIComponent(
                "تذكير: نسخة ODF الأسبوعية",
              )}&body=${encodeURIComponent(text())}`;
            }}
          >
            <Mail className="h-4 w-4" /> تذكير بالبريد
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const digits = (me?.phone ?? "").replace(/\D/g, "");
              window.open(
                `https://wa.me/${digits}?text=${encodeURIComponent(text())}`,
                "_blank",
              );
            }}
          >
            <MessageCircle className="h-4 w-4" /> تذكير بواتساب
          </Button>
          <Button variant="ghost" onClick={() => void close()}>
            لاحقًا اليوم
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
