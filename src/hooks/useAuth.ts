import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { setActor } from "@/lib/activity";
import { can, type AppUser, type Role } from "@/lib/auth";

async function fetchMe(): Promise<AppUser | null> {
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id;
  if (!uid) return null;
  const res = await supabase
    .from("app_users")
    .select("id, work_number, full_name, role, is_blocked, auth_user_id, email, phone")
    .eq("auth_user_id", uid)
    .maybeSingle();
  if (res.error) throw res.error;
  return (res.data as AppUser | null) ?? null;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: me, isLoading } = useQuery({ queryKey: ["me"], queryFn: fetchMe });

  useEffect(() => {
    setActor(me ?? null);
  }, [me]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void queryClient.invalidateQueries({ queryKey: ["me"] });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const role: Role | null = me?.role ?? null;
  return { me: me ?? null, role, isLoading, perms: can(role) };
}
