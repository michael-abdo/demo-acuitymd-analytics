// Simple API logging
export function logRequest(method: string, path: string) {
  console.log(`API: ${method} ${path}`);
}

export function logResponse(method: string, path: string, status: number, duration: number) {
  console.log(`API: ${method} ${path} ${status} ${duration}ms`);
}