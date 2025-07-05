import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { config } from './config';

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: config.AZURE_AD_CLIENT_ID!,
      clientSecret: config.AZURE_AD_CLIENT_SECRET!,
      tenantId: config.AZURE_AD_TENANT_ID,
      authorization: {
        params: {
          scope: "openid profile email",
          redirect_uri: config.NEXTAUTH_URL + "/api/auth/callback/azure-ad"
        }
      }
    }),
  ],
  pages: {
    signIn: "/sign-in",
    signOut: "/auth/signout",
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
      // Redirect to Microsoft authentication directly when trying to access any signin page
      if (url.includes("/auth/signin")) {
        return `${baseUrl}/sign-in`;
      }
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  secret: config.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: config.IS_DEVELOPMENT,
}; 