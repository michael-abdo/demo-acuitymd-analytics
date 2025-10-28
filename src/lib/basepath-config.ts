// Base path configuration locked to root routing
export const BASEPATH_CONFIG = {
  basePath: null as string | null,
  nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  publicBasePath: null as string | null,
};
