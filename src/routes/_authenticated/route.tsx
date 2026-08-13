import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/" });

    const res = await supabase
      .from("app_users")
      .select("id, is_blocked")
      .eq("auth_user_id", data.user.id)
      .maybeSingle();

    if (!res.data || res.data.is_blocked) {
      await supabase.auth.signOut();
      throw redirect({ to: "/" });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
