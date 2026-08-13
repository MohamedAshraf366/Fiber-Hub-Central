export type Role = "manager" | "engineer" | "technician";

export const ROLE_LABELS: Record<Role, string> = {
  manager: "مدير",
  engineer: "مهندس",
  technician: "فني",
};

export const workNumberEmail = (workNumber: string) =>
  `${workNumber.trim().toLowerCase()}@fiberhub.local`;

export type AppUser = {
  id: string;
  work_number: string;
  full_name: string;
  role: Role;
  is_blocked: boolean;
  auth_user_id: string | null;
  email: string | null;
  phone: string | null;
};

export const can = (role: Role | null) => ({
  view: role !== null,
  edit: role === "manager" || role === "engineer",
  delete: role === "manager",
  manage: role === "manager",
});
