import Link from "next/link";
import { auth } from "~/server/auth";

import { Button } from "~/components/ui/button";
import RouteLayout from "~/components/layout/route-layout";

export default async function SandboxRoutingPage() {
  const session = await auth();

  const redirectLink = session?.user
    ? `/${session.user.id}/overview`
    : `/sign-in?callbackUrl=${encodeURIComponent("/")}`;

  return (
    <>
      <RouteLayout>
        <div className="flex flex-1 flex-col items-center justify-center">
          <h1 className="scroll-m-20 text-center text-4xl font-extrabold tracking-tight lg:text-5xl">
            {" "}
            Welcome to Solidarity Pathways
          </h1>
          <p className="text-center leading-7 [&:not(:first-child)]:mt-6">
            A simpler way to generate optimal routes for your delivery needs.
            Check back later for more details.
          </p>

          <Link href={redirectLink}>
            <Button className="my-3">
              {session?.user
                ? "Create a depot to get started"
                : "Login to get started"}
            </Button>
          </Link>
        </div>
      </RouteLayout>
    </>
  );
}
