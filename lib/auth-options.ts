import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID || '',
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || '',
      tenantId: process.env.AZURE_AD_TENANT_ID || '',
      authorization: {
        params: {
          scope: "openid profile email"
        }
      }
    }),
  ],
  pages: {
    signIn: process.env.SIGNIN_PAGE || "/sign-in",
    signOut: process.env.SIGNOUT_PAGE || "/auth/signout",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.accessToken = account.access_token;
        token.id = profile.sub || (profile as any).oid || profile.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.accessToken = token.accessToken as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      const basePath = process.env.BASE_PATH || '';
      const defaultRedirect = process.env.DEFAULT_REDIRECT_PATH || "/dashboard";
      const signinPath = process.env.SIGNIN_PAGE || "/sign-in";
      const dashboardPath = process.env.DASHBOARD_PATH || "/dashboard";
      
      const fullBaseUrl = baseUrl + basePath;
      
      if (url.includes("/auth/signin")) {
        return fullBaseUrl + signinPath;
      }
      if (url === dashboardPath || url.endsWith(dashboardPath)) {
        return fullBaseUrl + dashboardPath;
      }
      if (url.startsWith("/")) {
        return fullBaseUrl + url;
      }
      try {
        if (new URL(url).origin === fullBaseUrl) return url;
      } catch (e) {
        // Invalid URL
      }
      return fullBaseUrl + defaultRedirect;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-build',
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  debug: false,
};
