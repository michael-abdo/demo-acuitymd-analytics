import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { config } from "./config";
import { logAuthentication } from "./logger";
// Simple Azure AD configuration matching vvg_invoice pattern

// Extend NextAuthOptions to include trustHost (available in v4.24+ but not in types)
type ExtendedAuthOptions = NextAuthOptions & { trustHost?: boolean };

export const authOptions: ExtendedAuthOptions = {
  providers: [
    AzureADProvider({
      id: "azure-ad",
      clientId: config.AZURE_AD_CLIENT_ID,
      clientSecret: config.AZURE_AD_CLIENT_SECRET,
      tenantId: config.AZURE_AD_TENANT_ID,
      authorization: {
        params: {
          scope: "openid profile email",
          redirect_uri: `${config.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/callback/azure-ad`
        }
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
      console.log('[REDIRECT DEBUG] Called with:', { url, baseUrl, BASE_PATH: config.BASE_PATH });
      console.log('[REDIRECT DEBUG] URL type:', typeof url, 'BaseURL type:', typeof baseUrl);
      
      // Handle empty BASE_PATH for local development
      const prefix = config.BASE_PATH || '';
      
      // If url is already the baseUrl, just return it
      if (url === baseUrl) {
        console.log('[REDIRECT DEBUG] URL equals baseUrl, returning:', baseUrl);
        return baseUrl;
      }
      
      if (url.includes("/auth/signin") || url.includes("/sign-in")) {
        console.log('[REDIRECT DEBUG] Matched sign-in condition');
        return baseUrl + (prefix ? `${prefix}/sign-in` : '/sign-in');
      }
      if (url === "/dashboard" || url.endsWith("/dashboard")) {
        console.log('[REDIRECT DEBUG] Matched dashboard condition');
        const redirectTo = baseUrl + (prefix ? `${prefix}/dashboard` : '/dashboard');
        console.log('[REDIRECT DEBUG] Redirecting to:', redirectTo);
        return redirectTo;
      }
      if (url.startsWith("/") && prefix && !url.startsWith(prefix)) {
        console.log('[REDIRECT DEBUG] Matched relative URL without basePath');
        return baseUrl + prefix + url;
      }
      if (prefix && url.startsWith(prefix)) {
        console.log('[REDIRECT DEBUG] Matched URL with basePath');
        return baseUrl + url;
      }
      try {
        const urlObj = new URL(url);
        const baseUrlObj = new URL(baseUrl);
        if (urlObj.origin === baseUrlObj.origin) {
          console.log('[REDIRECT DEBUG] Matched same origin absolute URL');
          console.log('[REDIRECT DEBUG] Returning URL:', url);
          return url;
        }
      } catch (e) {
        console.log('[REDIRECT DEBUG] URL parsing error:', (e as Error).message);
        console.log('[REDIRECT DEBUG] Problematic URL:', url);
      }
      console.log('[REDIRECT DEBUG] Fallback to dashboard');
      const fallbackUrl = baseUrl + (prefix ? `${prefix}/dashboard` : '/dashboard');
      console.log('[REDIRECT DEBUG] Final redirect URL:', fallbackUrl);
      return fallbackUrl;
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
    // SECURITY: Reduced from 30 days to 7 days to limit exposure if JWT is compromised
    maxAge: 7 * 24 * 60 * 60,
  },
  // Trust X-Forwarded-Host header when behind reverse proxy (ALB, Nginx, etc.)
  // Fixes redirect URLs using localhost instead of actual domain
  trustHost: true,
  debug: process.env.NODE_ENV === 'development',
  // Configure cookies to work with proxy - Use BASE_PATH for cookie isolation
  // SECURITY: Use secure cookies in production (HTTPS required)
  cookies: (() => {
    const useSecureCookies = process.env.NODE_ENV === 'production';
    const cookiePath = config.BASE_PATH || '/';
    return {
      sessionToken: {
        name: `next-auth.session-token`,
        options: {
          httpOnly: true,
          sameSite: 'lax' as const,
          path: cookiePath,
          secure: useSecureCookies,
        },
      },
      callbackUrl: {
        name: `next-auth.callback-url`,
        options: {
          sameSite: 'lax' as const,
          path: cookiePath,
          secure: useSecureCookies,
        },
      },
      csrfToken: {
        name: `next-auth.csrf-token`,
        options: {
          httpOnly: true,
          sameSite: 'lax' as const,
          path: cookiePath,
          secure: useSecureCookies,
        },
      },
    };
  })(),
};
