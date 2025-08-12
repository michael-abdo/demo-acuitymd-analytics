import { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Extends the built-in session with additional properties
   */
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
    accessToken: string;
  }

  /**
   * Extends the built-in JWT with additional properties
   */
  interface JWT {
    id?: string;
    accessToken?: string;
  }
} 