// Simple hook for basePath handling
export function useBasePath() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  
  return {
    pagePath: (path: string) => `${basePath}${path}`,
    apiPath: (path: string) => `${basePath}${path}`,
    assetPath: (path: string) => `${basePath}${path}`,
  };
}