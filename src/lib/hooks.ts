// Simple hook for basePath handling
export function useBasePath() {
  return {
    pagePath: (path: string) => path,
    apiPath: (path: string) => path,
    assetPath: (path: string) => path,
  };
}
