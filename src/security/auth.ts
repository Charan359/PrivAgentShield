/**
 * PRIVAGENTSHIELD ROLE-BASED ACCESS CONTROL (RBAC)
 * Enforces administrative and audit inspection permission boundaries.
 */

export type UserRole = "ADMIN" | "SECURITY_ANALYST" | "OPERATOR" | "VIEWER";

export interface UserSession {
  userId: string;
  role: UserRole;
  username: string;
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: [
    "manage_agents",
    "manage_policies",
    "edit_topology",
    "approve_quarantine",
    "reject_quarantine",
    "view_audit_ledger",
    "view_runtime_monitor",
    "system_settings",
  ],
  SECURITY_ANALYST: [
    "approve_quarantine",
    "reject_quarantine",
    "view_audit_ledger",
    "view_runtime_monitor",
    "inspect_payloads",
  ],
  OPERATOR: [
    "view_runtime_monitor",
    "inspect_payloads",
    "view_topology",
  ],
  VIEWER: [
    "view_dashboard",
    "view_topology",
  ],
};

export class AuthManager {
  private currentSession: UserSession = {
    userId: "usr-admin-01",
    role: "ADMIN",
    username: "Security Officer",
  };

  getCurrentSession(): UserSession {
    return { ...this.currentSession };
  }

  setRole(role: UserRole): void {
    this.currentSession.role = role;
  }

  hasPermission(permission: string, role?: UserRole): boolean {
    const targetRole = role ?? this.currentSession.role;
    const permissions = ROLE_PERMISSIONS[targetRole] ?? [];
    return permissions.includes(permission);
  }
}

export const authManager = new AuthManager();
