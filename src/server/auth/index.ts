import NextAuth from "next-auth";
import { cache } from "react";

import { env } from "~/env";
import { authConfig } from "./config";

const useSecureCookies = env.NEXTAUTH_URL.startsWith("https://");
const cookiePrefix = useSecureCookies ? "__Secure-" : "";
const hostName = !useSecureCookies
  ? new URL(env.NEXTAUTH_URL).hostname
  : env.HOSTNAME;

const {
  auth: uncachedAuth,
  handlers,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  pages: {
    signIn: "/sign-in",
  },
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        domain: "." + hostName,
        secure: useSecureCookies,
      },
    },

    csrfToken: {
      name: `${cookiePrefix}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        domain: "." + hostName,
        secure: useSecureCookies,
      },
    },
  },
});

const auth = cache(uncachedAuth);

export { auth, handlers, signIn, signOut };
