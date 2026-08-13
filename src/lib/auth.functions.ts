import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  work_number: z.string().trim().min(1).max(20),
  password: z.string().min(1).max(72),
});

/**
 * Provisions the Supabase auth account for an allowed staff member on first login.
 * Only work numbers present in app_users can be provisioned, and the first
 * password must equal the work number itself.
 */
export const provisionAccount = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const workNumber = data.work_number.trim();
    const { data: appUser, error } = await supabaseAdmin
      .from("app_users")
      .select("id, work_number, full_name, role, is_blocked, auth_user_id")
      .eq("work_number", workNumber)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!appUser) throw new Error("رقم العامل غير مسجل ضمن المستخدمين المسموح لهم");
    if (appUser.is_blocked) throw new Error("تم حظر هذا المستخدم — راجع المدير");
    if (appUser.auth_user_id) return { created: false as const };

    if (data.password !== workNumber) {
      throw new Error("أول تسجيل دخول: كلمة المرور هي نفس رقم العامل");
    }

    const email = `${workNumber.toLowerCase()}@fiberhub.local`;
    let uid: string | null = null;

    const created = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { work_number: workNumber, full_name: appUser.full_name },
    });

    if (created.data?.user) {
      uid = created.data.user.id;
    } else {
      // The auth account already exists (e.g. a previous partial signup):
      // find it and re-link it instead of failing.
      const msg = created.error?.message ?? "";
      const alreadyExists =
        msg.toLowerCase().includes("already") || created.error?.status === 422;
      if (!alreadyExists) throw new Error(msg || "تعذّر إنشاء الحساب");

      for (let page = 1; page <= 20 && !uid; page++) {
        const list = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
        if (list.error) throw new Error(list.error.message);
        const match = list.data.users.find(
          (u) => (u.email ?? "").toLowerCase() === email,
        );
        if (match) uid = match.id;
        if (list.data.users.length < 200) break;
      }
      if (!uid) throw new Error("تعذّر العثور على الحساب المرتبط برقم العامل");

      const reset = await supabaseAdmin.auth.admin.updateUserById(uid, {
        password: data.password,
        email_confirm: true,
        user_metadata: { work_number: workNumber, full_name: appUser.full_name },
      });
      if (reset.error) throw new Error(reset.error.message);
    }

    const upd = await supabaseAdmin
      .from("app_users")
      .update({ auth_user_id: uid })
      .eq("id", appUser.id);
    if (upd.error) throw new Error(upd.error.message);

    const roleRes = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: uid, role: appUser.role }, { onConflict: "user_id,role" });
    if (roleRes.error) throw new Error(roleRes.error.message);

    return { created: true as const };
  });

const adminSchema = z.object({
  user_id: z.string().uuid(),
  work_number: z.string().trim().min(1).max(20).optional(),
  full_name: z.string().trim().min(2).max(120).optional(),
  role: z.enum(["manager", "engineer", "technician"]).optional(),
  is_blocked: z.boolean().optional(),
  email: z.string().trim().email().max(255).nullable().optional(),
  phone: z.string().trim().min(6).max(30).nullable().optional(),
  password: z.string().min(4).max(72).optional(),
});

/**
 * Manager-only edit of any staff account: work number (which is also the login
 * identity), name, role, block state, contact details and password.
 */
export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => adminSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isManager, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "manager",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isManager) throw new Error("هذه العملية للمدير فقط");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target, error: findErr } = await supabaseAdmin
      .from("app_users")
      .select("id, work_number, full_name, role, auth_user_id")
      .eq("id", data.user_id)
      .maybeSingle();
    if (findErr) throw new Error(findErr.message);
    if (!target) throw new Error("المستخدم غير موجود");

    const patch: {
      work_number?: string;
      full_name?: string;
      role?: "manager" | "engineer" | "technician";
      is_blocked?: boolean;
      email?: string | null;
      phone?: string | null;
    } = {};
    if (data.work_number !== undefined) patch.work_number = data.work_number;
    if (data.full_name !== undefined) patch.full_name = data.full_name;
    if (data.role !== undefined) patch.role = data.role;
    if (data.is_blocked !== undefined) patch.is_blocked = data.is_blocked;
    if (data.email !== undefined) patch.email = data.email || null;
    if (data.phone !== undefined) patch.phone = data.phone || null;

    if (Object.keys(patch).length) {
      const upd = await supabaseAdmin.from("app_users").update(patch).eq("id", target.id);
      if (upd.error) throw new Error(upd.error.message);
    }

    if (target.auth_user_id) {
      const authPatch: Record<string, unknown> = {};
      if (data.work_number && data.work_number !== target.work_number) {
        authPatch['email'] = `${data.work_number.toLowerCase()}@fiberhub.local`;
        authPatch['email_confirm'] = true;
      }
      if (data.password) authPatch['password'] = data.password;
      if (data.work_number || data.full_name) {
        authPatch['user_metadata'] = {
          work_number: data.work_number ?? target.work_number,
          full_name: data.full_name ?? target.full_name,
        };
      }
      if (Object.keys(authPatch).length) {
        const res = await supabaseAdmin.auth.admin.updateUserById(target.auth_user_id, authPatch);
        if (res.error) throw new Error(res.error.message);
      }
      if (data.role && data.role !== target.role) {
        const del = await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", target.auth_user_id);
        if (del.error) throw new Error(del.error.message);
        const ins = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: target.auth_user_id, role: data.role });
        if (ins.error) throw new Error(ins.error.message);
      }
    } else if (data.password) {
      throw new Error("لم يسجّل هذا المستخدم الدخول بعد — كلمة المرور الأولى هي رقم العامل");
    }

    return { ok: true as const };
  });
