import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { config } from "./config";
import { logAuthentication } from "./logger";
import { getAuthorizationParamsWithWorkaround } from "./auth-nextauth-v4-workaround";

// NextAuth.js v4 workaround: manually include redirect_uri with basePath
// Remove this workaround when upgrading to NextAuth v5

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: config.AZURE_AD_CLIENT_ID,
      clientSecret: config.AZURE_AD_CLIENT_SECRET,
      tenantId: config.AZURE_AD_TENANT_ID,
      authorization: {
        params: getAuthorizationParamsWithWorkaround({
          scope: "openid profile email offline_access User.Read"
        })
      }
    }),
  ],
  pages: {
    signIn: "/sign-in",
    signOut: "/auth/signout",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.accessToken = account.access_token;
        token.id = profile.sub || (profile as any).oid || profile.email;
        
        // Log successful authentication
        logAuthentication('jwt-token-created', token.id as string, {
          provider: account.provider,
          email: profile.email
        });
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.accessToken = token.accessToken as string;
        
        // Log session creation
        logAuthentication('session-created', session.user.id, {
          email: session.user.email,
          name: session.user.name
        });
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // NextAuth v4 handles basePath automatically in most cases
      // We just need to ensure relative URLs are properly handled
      console.log('NextAuth redirect callback:', { url, baseUrl });
      
      // For relative URLs, ensure they have the baseUrl
      if (url.startsWith("/")) {
        return baseUrl + url;
      }
      
      // For absolute URLs, return as is
      return url;
    },
  },
  events: {
    async signIn({ user, account, profile: _profile }) {
      logAuthentication('user-signed-in', user?.id, {
        email: user?.email,
        provider: account?.provider
      });
    },
    async signOut({ token }) {
      logAuthentication('user-signed-out', token?.id as string);
    },
    async createUser({ user }) {
      logAuthentication('user-created', user?.id, {
        email: user?.email
      });
    },
    async linkAccount({ user, account }) {
      logAuthentication('account-linked', user?.id, {
        provider: account?.provider
      });
    }
  },
  secret: config.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  debug: false,
};
