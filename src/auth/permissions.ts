import type { UserRole } from "./AuthContext";

export interface RolePermissions {
  canViewDashboard: boolean;
  canEditDashboard: boolean;
  canManageWidgets: boolean;
  canConfigureWidgets: boolean;
  canManageUsers: boolean;
  canExportData: boolean;
}

const rolePermissions: Record<UserRole, RolePermissions> = {
  admin: {
    canViewDashboard: true,
    canEditDashboard: true,
    canManageWidgets: true,
    canConfigureWidgets: true,
    canManageUsers: true,
    canExportData: true,
  },

  analyst: {
    canViewDashboard: true,
    canEditDashboard: true,
    canManageWidgets: true,
    canConfigureWidgets: true,
    canManageUsers: false,
    canExportData: true,
  },

  viewer: {
    canViewDashboard: true,
    canEditDashboard: false,
    canManageWidgets: false,
    canConfigureWidgets: false,
    canManageUsers: false,
    canExportData: false,
  },
};

export function getRolePermissions(
  role: UserRole | null,
): RolePermissions {
  if (!role) {
    return rolePermissions.viewer;
  }

  return rolePermissions[role];
}