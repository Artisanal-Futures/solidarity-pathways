// import { Suspense } from "react";

// import { Separator } from "~/components/ui/separator";

// import {
//   ErrorText,
//   ProviderSignInButton,
//   ProviderSignInForm,
// } from "../_components";

// export const metadata = {
//   title: "Sign In ",
// };

// export default function SignInPage() {
//   const providers = [
//     {
//       id: "google",
//       name: "Google",
//     },
//     {
//       id: "discord",
//       name: "Discord",
//     },

//     {
//       id: "auth0",
//       name: "Auth0",
//     },
//   ];

//   return (
//     <>
//       <Suspense fallback={<div>Loading...</div>}>
//         <ErrorText />
//       </Suspense>

//       <ProviderSignInForm storeName={"Artisanal Futures"}>
//         <Suspense fallback={<div>Loading...</div>}>
//           <div className="flex w-full flex-col">
//             <div className="flex gap-4">
//               {providers &&
//                 Object.values(providers).map((provider) => {
//                   if (
//                     provider.name !== "Auth0" &&
//                     provider.name !== "Credentials"
//                   ) {
//                     return (
//                       <ProviderSignInButton
//                         id={provider.id}
//                         name={provider.name}
//                         key={provider.name}
//                       />
//                     );
//                   }
//                 })}
//             </div>
//             <div className="relative my-4">
//               <div className="absolute inset-0 flex items-center">
//                 <Separator />
//               </div>
//               <div className="relative flex justify-center text-xs uppercase">
//                 <span className="bg-background px-2 text-muted-foreground">
//                   or
//                 </span>
//               </div>
//             </div>

//             <div className="flex w-full justify-center">
//               <ProviderSignInButton id={"auth0"} name={"Sign in with email"} />
//             </div>
//           </div>
//         </Suspense>
//       </ProviderSignInForm>
//     </>
//   );
// }
import { redirect } from "next/navigation";
import { signIn } from "~/server/auth";
import { AuthError } from "next-auth";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";

export default async function SignInPage(props: {
  searchParams: { callbackUrl: string | undefined; error?: string };
}) {
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Welcome Back</CardTitle>
          <CardDescription className="text-center">
            Sign in to your Artisanal Futures account
          </CardDescription>
          {props.searchParams?.error && (
            <div className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-600">
              {props.searchParams.error === "CredentialsSignin"
                ? "Invalid credentials"
                : `Error: ${props.searchParams.error}`}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {Object.values(providers).map((provider) => (
              <form
                key={provider.id}
                action={async () => {
                  "use server";
                  try {
                    await signIn(provider.id, {
                      redirectTo: props.searchParams?.callbackUrl ?? "/",
                    });
                  } catch (error) {
                    if (error instanceof AuthError) {
                      return redirect(`/sign-in?error=${error.type}`);
                    }
                    throw error;
                  }
                }}
              >
                <Button
                  type="submit"
                  variant={provider.id === "auth0" ? "default" : "outline"}
                  className="flex w-full items-center justify-center gap-2"
                >
                  {provider.id === "google" && (
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                  )}
                  {provider.id === "discord" && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M19.952 5.672c-1.904-1.531-4.916-1.79-5.044-1.801-0.201-0.017-0.392 0.097-0.474 0.281-0.006 0.012-0.089 0.25-0.11 0.373-0.951 0.124-1.775 0.373-2.512 0.757l-0.157 0.082c-0.139 0.073-0.29 0.111-0.445 0.111-0.143 0-0.283-0.031-0.412-0.088l-0.194-0.088c-0.747-0.38-1.581-0.627-2.483-0.734-0.021-0.123-0.104-0.36-0.11-0.372-0.08-0.187-0.272-0.304-0.474-0.281-0.128 0.01-3.139 0.269-5.069 1.822-0.355 0.285-3.305 2.64-4.35 8.949 0.021 0.352 0.503 3.997 3.968 4.729 0.012 0.002 0.023 0.003 0.035 0.003 0.129 0 0.254-0.056 0.339-0.154 0.586-0.673 1.060-1.311 1.41-1.897 0.588-0.979 1.003-1.908 1.237-2.778 0.044-0.159-0.010-0.33-0.137-0.429-0.471-0.365-0.92-0.766-1.333-1.196-0.126-0.131-0.173-0.318-0.122-0.492s0.187-0.31 0.361-0.36c0.232-0.066 0.467-0.122 0.705-0.169 1.127-0.225 2.303-0.21 3.516 0.043 0.17 0.036 0.311 0.156 0.362 0.33s-0.004 0.359-0.131 0.489c-0.441 0.45-0.91 0.866-1.394 1.236-0.129 0.099-0.183 0.273-0.137 0.433 0.234 0.865 0.649 1.791 1.237 2.778 0.35 0.581 0.823 1.218 1.41 1.891 0.085 0.099 0.21 0.155 0.339 0.155 0.012 0 0.024-0.001 0.035-0.003 3.46-0.735 3.943-4.379 3.965-4.731-1.044-6.308-3.995-8.662-4.35-8.947zM8.011 14.594c-0.735 0-1.331-0.676-1.331-1.506 0-0.83 0.596-1.506 1.331-1.506s1.331 0.676 1.331 1.506c0 0.83-0.596 1.506-1.331 1.506zM15.989 14.594c-0.735 0-1.331-0.676-1.331-1.506 0-0.83 0.596-1.506 1.331-1.506s1.331 0.676 1.331 1.506c0 0.83-0.596 1.506-1.331 1.506z"
                        fill="#5865F2"
                      />
                    </svg>
                  )}
                  {provider.id === "auth0" && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M21.8,7.7L19,4.8l0.9-3.3l-3.3,0.9L13.4,0l-0.9,3.3L9.2,4.2L10.1,7.5L7.3,10.3l3.3,0.9l0.9,3.3l3.3-0.9l2.8,2.8l0.9-3.3 l3.3-0.9L21.8,7.7z M13.4,12.1c-1.4,0-2.6-1.2-2.6-2.6s1.2-2.6,2.6-2.6s2.6,1.2,2.6,2.6S14.8,12.1,13.4,12.1z"
                        fill="#EB5424"
                      />
                    </svg>
                  )}
                  <span className="ml-2">Sign in with {provider.name}</span>
                </Button>
              </form>
            ))}

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">
                  Don&apos;t have an account?
                </span>
              </div>
            </div>

            <Button variant="link" className="w-full">
              Create an account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
