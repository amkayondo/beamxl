import { TRPCError } from "@trpc/server";

export type OrgRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEW_ONLY";

export const roleHierarchy: Record<OrgRole, number> = {
  VIEW_ONLY: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

export function hasRequiredRole(role: OrgRole, minimumRole: OrgRole) {
  return roleHierarchy[role] >= roleHierarchy[minimumRole];
}

export function assertRole(role: OrgRole, minimumRole: OrgRole) {
  if (!hasRequiredRole(role, minimumRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Requires ${minimumRole} role`,
    });
  }
}
