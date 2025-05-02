import { redirect } from "next/navigation";

import { env } from "~/env";

const CALLBACK_URL = env.NEXTAUTH_URL;

const HOST_URL = `${
  env.NODE_ENV === "production" ? "https" : "http"
}://${env.HOSTNAME}${
  env.NODE_ENV === "production" ? "" : ":3000"
}/auth/sign-up?callbackUrl=${encodeURIComponent(CALLBACK_URL)}`;

export default async function SignUp() {
  redirect(HOST_URL);
}
