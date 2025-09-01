// Simple toast notifications
export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  console.log(`[${type.toUpperCase()}] ${message}`);
  // In a real app, this would show a toast notification
}

export const toast = {
  success: (message: string) => showToast(message, 'success'),
  error: (message: string) => showToast(message, 'error'),
  info: (message: string) => showToast(message, 'info'),
};