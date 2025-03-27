import Image from "next/image";
import Link from "next/link";

import RouteLayout from "~/components/layout/route-layout";
import { Button } from "~/components/ui/button";

const UnauthorizedPage = () => {
  return (
    <>
      <RouteLayout>
        <div className="flex flex-col items-center">
          <Image
            src="/img/lost.svg"
            width={500}
            height={500}
            alt="Unauthorized"
          />
          <h1 className="mt-5 text-7xl font-bold">Unauthorized</h1>
          <h2 className="text-xl text-muted-foreground">
            Oh no, it looks like you don&apos;t have access to this page.
          </h2>

          <div className="mt-5 flex justify-around gap-4">
            <Link href="/">
              <Button>Head back to home</Button>
            </Link>
          </div>
        </div>
      </RouteLayout>
    </>
  );
};

export default UnauthorizedPage;
