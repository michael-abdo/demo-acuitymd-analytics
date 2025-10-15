// BasePath configuration for deployment flexibility
export const BASEPATH_CONFIG = {
  basePath: '',
  nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  publicBasePath: '',
};
