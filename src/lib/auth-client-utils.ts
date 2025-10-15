// Client-side auth utilities
export function getAuthBasePath(): string {
  return '';
}

export function getSignInUrl(): string {
  return '/api/auth/signin';
}

export function getSignOutUrl(): string {
  return '/api/auth/signout';
}

export function signOut() {
  window.location.href = getSignOutUrl();
}
