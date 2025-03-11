import { Suspense } from "react";

import { Separator } from "~/components/ui/separator";

import {
  ErrorText,
  ProviderSignInButton,
  ProviderSignInForm,
} from "../_components";

export const metadata = {
  title: "Sign In ",
};

export default function SignInPage() {
  const providers = [
    {
      id: "google",
      name: "Google",
    },
    {
      id: "discord",
      name: "Discord",
    },

    {
      id: "auth0",
      name: "Auth0",
    },
  ];

  return (
    <>
      <Suspense fallback={<div>Loading...</div>}>
        <ErrorText />
      </Suspense>

      <ProviderSignInForm storeName={"Artisanal Futures"}>
        <Suspense fallback={<div>Loading...</div>}>
          <div className="flex w-full flex-col">
            <div className="flex gap-4">
              {providers &&
                Object.values(providers).map((provider) => {
                  if (
                    provider.name !== "Auth0" &&
                    provider.name !== "Credentials"
                  ) {
                    return (
                      <ProviderSignInButton
                        id={provider.id}
                        name={provider.name}
                        key={provider.name}
                      />
                    );
                  }
                })}
            </div>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  or
                </span>
              </div>
            </div>

            <div className="flex w-full justify-center">
              <ProviderSignInButton id={"auth0"} name={"Sign in with email"} />
            </div>
          </div>
        </Suspense>
      </ProviderSignInForm>
    </>
  );
}
