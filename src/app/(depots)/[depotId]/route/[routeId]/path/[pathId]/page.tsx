import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "~/server/auth";
import { db } from "~/server/db";
import {
  createDriverVerificationCookie,
  generateDriverPassCode,
} from "~/utils/server/auth-driver-passcode";
import { OptimizedPathClient } from "./_components/path-client";

export default async function PathPage({
  params,
  searchParams,
}: {
  params: { depotId: string; routeId: string; pathId: string };
  searchParams: { pc?: string; driverId?: string };
}) {
  const session = await auth();

  if (!session) return redirect("/sandbox");

  if (session?.user?.role === "DRIVER") return redirect("/unauthorized");

  if (!session?.user) return redirect("/sandbox");

  const depot = await db.depot.findUnique({
    where: { id: params.depotId },
  });

  if (!depot) return redirect("/");

  const isOwner = session.user.id === depot.ownerId;

  if (!isOwner) return redirect("/unauthorized");

  // Handle driver verification
  const { pc: passcode } = searchParams;
  const cookieStore = await cookies();
  const verifiedDriverCookie = cookieStore.get("verifiedDriver")?.value;
  let verifiedDriver: string | null = null;

  if (passcode || verifiedDriverCookie) {
    try {
      if (searchParams.driverId) {
        const driver = await db.vehicle.findUnique({
          where: { id: searchParams.driverId },
          include: { driver: true },
        });

        if (driver && driver.driver) {
          const expectedPasscode = generateDriverPassCode({
            pathId: params.pathId,
            depotCode: depot.magicCode,
            email: driver.driver.email,
          });

          if (verifiedDriverCookie === expectedPasscode) {
            verifiedDriver = verifiedDriverCookie;
          } else if (expectedPasscode === passcode) {
            verifiedDriver = passcode;
            // Set cookie on client side in the component
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  return <OptimizedPathClient verifiedDriver={verifiedDriver} />;
}
