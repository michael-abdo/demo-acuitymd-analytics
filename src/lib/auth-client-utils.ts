// Client-side auth utilities
export function getAuthBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || '';
}

export function getSignInUrl(): string {
  const basePath = getAuthBasePath();
  return `${basePath}/api/auth/signin`;
}

export function getSignOutUrl(): string {
  const basePath = getAuthBasePath();
  return `${basePath}/api/auth/signout`;
}

export function signOut() {
  window.location.href = getSignOutUrl();
}