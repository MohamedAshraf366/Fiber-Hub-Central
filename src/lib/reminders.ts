import { supabase } from "@/integrations/supabase/client";

export type ExportReminder = {
  app_user_id: string;
  last_export_at: string | null;
  last_dismissed_at: string | null;
};

export async function fetchReminder(appUserId: string): Promise<ExportReminder | null> {
  const { data, error } = await supabase
    .from("export_reminders")
    .select("app_user_id, last_export_at, last_dismissed_at")
    .eq("app_user_id", appUserId)
    .maybeSingle();
  if (error) throw error;
  return (data as ExportReminder | null) ?? null;
}

async function upsert(appUserId: string, patch: Partial<ExportReminder>) {
  const { error } = await supabase
    .from("export_reminders")
    .upsert({ app_user_id: appUserId, ...patch }, { onConflict: "app_user_id" });
  if (error) throw error;
}

export const markExported = (appUserId: string) =>
  upsert(appUserId, { last_export_at: new Date().toISOString() });

export const dismissReminder = (appUserId: string) =>
  upsert(appUserId, { last_dismissed_at: new Date().toISOString() });

const sameDay = (iso: string | null) =>
  !!iso && new Date(iso).toDateString() === new Date().toDateString();

/** Monday nudge: due every Monday, or whenever the last backup is over a week old. */
export function isBackupDue(reminder: ExportReminder | null): boolean {
  if (sameDay(reminder?.last_dismissed_at ?? null)) return false;
  const last = reminder?.last_export_at ? new Date(reminder.last_export_at).getTime() : 0;
  const days = (Date.now() - last) / 86_400_000;
  const isMonday = new Date().getDay() === 1;
  if (isMonday) return !sameDay(reminder?.last_export_at ?? null);
  return days > 7;
}
