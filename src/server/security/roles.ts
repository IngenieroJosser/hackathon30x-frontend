/** Server-side role matrix; UI hints are never an authorization boundary. */
export type UserRole = 'ADMIN' | 'APPROVER' | 'AUDITOR';
export type Permission = 'read' | 'ingest' | 'verify' | 'evaluate' | 'reopen' | 'manage_policy' | 'manage_vendor' | 'verify_bank' | 'resolve_approval';
export const ROLE_PERMISSIONS: Readonly<Record<UserRole,readonly Permission[]>> = {
  ADMIN: ['read','ingest','verify','evaluate','reopen','manage_policy','manage_vendor'],
  APPROVER: ['read','resolve_approval','verify_bank'],
  AUDITOR: ['read'],
};
export function can(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
