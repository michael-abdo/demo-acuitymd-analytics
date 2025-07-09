import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID || "",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "",
      tenantId: process.env.AZURE_AD_TENANT_ID || "",
      authorization: {
        params: {
          scope: "openid profile email"
        }
      }
    }),
  ],
  pages: {
    signIn: "/nda-analyzer/sign-in",
    signOut: "/nda-analyzer/auth/signout",
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
      if (url.includes("/auth/signin")) {
        return baseUrl + "/nda-analyzer/sign-in";
      }
      if (url === "/dashboard" || url.endsWith("/dashboard")) {
        return baseUrl + "/nda-analyzer/dashboard";
      }
      if (url.startsWith("/") && !url.startsWith("/nda-analyzer")) {
        return baseUrl + "/nda-analyzer" + url;
      }
      if (url.startsWith("/nda-analyzer")) {
        return baseUrl + url;
      }
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch (e) {
        // Invalid URL
      }
      return baseUrl + "/nda-analyzer/dashboard";
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-build",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  debug: false,
};
