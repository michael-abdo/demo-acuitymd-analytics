/**
 * NextAuth Configuration (Fail Fast)
 * Azure AD only - no other providers
 */

import { NextAuthOptions } from "next-auth";
import { createAzureADProvider } from './azure-ad';

export const authOptions: NextAuthOptions = {
  providers: [
    createAzureADProvider()
  ],
  pages: {
    signIn: "/auth/signin",
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
      // Handle basePath routing
      if (url.startsWith("/")) {
        return baseUrl + url;
      }
      return url;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};