/* eslint-disable @next/next/no-img-element */

import Link from "next/link";

import DynamicImage from "./_components/dynamic-image";

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  const year = new Date().getFullYear();

  return (
    <main className="flex min-h-screen flex-col">
      <div className="mx-auto h-full w-full max-w-7xl">
        <div className="relative flex h-16 items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="ml-4 flex gap-x-2 lg:ml-0">
            <img
              className="block h-6 w-auto lg:hidden"
              src="/logo_mobile.png"
              alt="Artisanal Futures logo"
            />
            <img
              className="hidden h-6 w-auto lg:block"
              src="/logo.png"
              alt="Artisanal Futures logo"
            />
          </Link>
        </div>
      </div>
      <div className="mx-auto flex h-full w-full max-w-7xl flex-grow flex-col items-stretch p-8">
        <div className="my-auto flex h-full w-full items-center gap-5 max-md:flex-col-reverse">
          <div className="justify-left flex lg:w-7/12">
            <div className="w-full max-w-lg rounded bg-background p-4">
              {children}
            </div>
          </div>
          <div className="flex justify-end px-4 lg:w-5/12">
            <DynamicImage />
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-7xl">
        <footer className="mt-16">
          <div className="mx-auto py-10">
            <p className="text-sm text-black">
              &copy; {year} Artisanal Futures. All rights reserved.
            </p>
          </div>
        </footer>{" "}
      </div>
    </main>
  );
};
export default AuthLayout;
