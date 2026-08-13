import { supabase } from "@/integrations/supabase/client";
import type { AppUser } from "./auth";

let actor: AppUser | null = null;

export function setActor(user: AppUser | null) {
  actor = user;
}

export type ActivityRow = {
  id: string;
  work_number: string | null;
  full_name: string | null;
  action: string;
  entity: string;
  entity_name: string | null;
  details: unknown;
  created_at: string;
};

export async function logActivity(
  action: string,
  entity: string,
  entityId: string | null,
  entityName: string | null,
  details?: Record<string, unknown>,
) {
  if (!actor?.auth_user_id) return;
  await supabase.from("activity_log").insert({
    user_id: actor.auth_user_id,
    work_number: actor.work_number,
    full_name: actor.full_name,
    action,
    entity,
    entity_id: entityId,
    entity_name: entityName,
    details: (details ?? null) as never,
  });
}

export async function fetchActivity(limit = 300): Promise<ActivityRow[]> {
  const { data, error } = await supabase
    .from("activity_log")
    .select("id, work_number, full_name, action, entity, entity_name, details, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ActivityRow[];
}
