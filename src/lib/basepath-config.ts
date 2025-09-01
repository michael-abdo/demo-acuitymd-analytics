// BasePath configuration for deployment flexibility
export const BASEPATH_CONFIG = {
  basePath: process.env.BASE_PATH || '',
  nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  publicBasePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
};