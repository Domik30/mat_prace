/**
 * Decode JWT payload without verification (for client-side reading of role).
 * Server always verifies tokens; this is only for UI decisions.
 */
export function decodeJwtPayload(token: string): { role?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadPart = parts[1];
    if (!payloadPart) return null;
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64)) as Record<string, unknown>;
    return payload as { role?: string };
  } catch {
    return null;
  }
}

const DASHBOARD_ROLES = ['lecturer', 'admin'];

export function canAccessDashboard(role: string | undefined): boolean {
  return !!role && DASHBOARD_ROLES.includes(role);
}
