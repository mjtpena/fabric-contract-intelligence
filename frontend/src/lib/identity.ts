export interface IdentityClaims {
  preferred_username?: string;
  upn?: string;
  email?: string;
}

export function decodeUserFromToken(token: string): string | null {
  const [, payload] = token.split('.');
  if (!payload) return null;
  try {
    const json = JSON.parse(atob(toBase64(payload))) as IdentityClaims;
    return json.preferred_username ?? json.upn ?? json.email ?? null;
  } catch {
    return null;
  }
}

function toBase64(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  return normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
}
