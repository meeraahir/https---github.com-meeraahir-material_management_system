import type { AuthUser } from "../types/auth.types";

const WRITE_ROLES = new Set(["admin", "manager", "staff"]);
const DELETE_ROLES = new Set(["admin", "manager"]);

export interface CrudPermissions {
  canCreate: boolean;
  canDelete: boolean;
  canEdit: boolean;
}

export function getCrudPermissions(user: AuthUser | null): CrudPermissions {
  const role = user?.role;
  const canEdit = role !== undefined && WRITE_ROLES.has(role);
  const canDelete = role !== undefined && DELETE_ROLES.has(role);

  return {
    canCreate: canEdit,
    canDelete,
    canEdit,
  };
}
