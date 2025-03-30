import { Toaster } from "@dreamwalker-studios/toasts";
import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { auth } from "~/server/auth";
import "~/styles/globals.css";
import { TRPCReactProvider } from "~/trpc/react";
import SessionProviderClientComponent from "./(auth)/_components/session-provider-client-component";

export const metadata: Metadata = {
  title: "Solidarity Pathways",
  description: "Routing application from Artisanal Futures",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body>
        <SessionProviderClientComponent session={session}>
          <TRPCReactProvider>
            <Toaster />
            {children}
          </TRPCReactProvider>
        </SessionProviderClientComponent>
      </body>
    </html>
  );
}
