import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { config } from "./config";
import { logAuthentication } from "./logger";

// NextAuth.js will automatically handle redirect URIs based on NEXTAUTH_URL

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: config.AZURE_AD_CLIENT_ID,
      clientSecret: config.AZURE_AD_CLIENT_SECRET,
      tenantId: config.AZURE_AD_TENANT_ID,
      authorization: {
        params: {
          scope: "openid profile email offline_access User.Read"
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
      const fullBaseUrl = baseUrl + config.BASE_PATH;
      
      // Handle sign-in redirects
      if (url.includes("/auth/signin")) {
        return fullBaseUrl + "/sign-in";
      }
      
      // Handle dashboard redirects
      if (url === "/dashboard" || url.endsWith("/dashboard")) {
        return fullBaseUrl + "/dashboard";
      }
      
      // Handle relative URLs
      if (url.startsWith("/")) {
        return fullBaseUrl + url;
      }
      
      // Handle same-origin URLs
      try {
        if (new URL(url).origin === fullBaseUrl) return url;
      } catch {
        // Invalid URL - fall through to default
      }
      
      // Default redirect to dashboard
      return fullBaseUrl + "/dashboard";
    },
  },
  events: {
    async signIn({ user, account, profile }) {
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
