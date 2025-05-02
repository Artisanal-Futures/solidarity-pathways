import type { Adapter } from "next-auth/adapters";
import { db } from "~/server/db";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import Auth0Provider from "next-auth/providers/auth0";
import DiscordProvider from "next-auth/providers/discord";
import GoogleProvider from "next-auth/providers/google";

import type { Role } from "@prisma/client";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { env } from "~/env";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    //   // ...other properties
    role: Role;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    DiscordProvider,
    Auth0Provider,
    GoogleProvider,
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
  adapter: PrismaAdapter(db) as Adapter,
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
        role: user.role,
      },
    }),

    async signIn(props) {
      const { user } = props;

      // No account, tries to sign in
      const authUser = await db.user.findUnique({
        where: { id: user.id },
      });

      if (!authUser && env.NODE_ENV === "production")
        return "/sign-in?error=account-not-found";

      return true;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      // Allow redirects to env.HOSTNAME
      else if (new URL(url).hostname === env.HOSTNAME) return url;
      return baseUrl;
    },
  },
} satisfies NextAuthConfig;
