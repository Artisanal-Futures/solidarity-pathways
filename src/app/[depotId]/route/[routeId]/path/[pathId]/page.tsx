import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

import { generateDriverPassCode } from "~/utils/server/auth-driver-passcode";

import { OptimizedPathClient } from "./_components/path-client";

export default async function PathPage({
  params,
  searchParams,
}: {
  params: Promise<{ depotId: string; routeId: string; pathId: string }>;
  searchParams: Promise<{ pc?: string; driverId?: string }>;
}) {
  const { depotId, pathId } = await params;
  const session = await auth();

  if (!session) return redirect("/sandbox");

  if (session?.user?.role === "DRIVER") return redirect("/unauthorized");

  if (!session?.user) return redirect("/sandbox");

  const depot = await db.depot.findUnique({
    where: { id: depotId },
  });

  if (!depot) return redirect("/");

  const isOwner = session.user.id === depot.ownerId;

  if (!isOwner) return redirect("/unauthorized");

  // Handle driver verification
  const { pc: passcode, driverId } = await searchParams;
  const cookieStore = await cookies();
  const verifiedDriverCookie = cookieStore.get("verifiedDriver")?.value;
  let verifiedDriver: string | null = null;

  if (passcode || verifiedDriverCookie) {
    try {
      if (driverId) {
        const driver = await db.vehicle.findUnique({
          where: { id: driverId },
          include: { driver: true },
        });

        if (driver && driver.driver) {
          const expectedPasscode = generateDriverPassCode({
            pathId,
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
