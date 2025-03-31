import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

import { clientRouterAlt } from "./routers/client";
import { clientRouter } from "./routers/clients";
import { depotRouter } from "./routers/depot-router";
import { driverRouter } from "./routers/driver";
import { driverRouter2 } from "./routers/driver-router2";
import { jobRouter } from "./routers/job";
import { routePlanRouter } from "./routers/route-plan";
import { solidarityPathwaysMessagingRouter } from "./routers/routing";
import { vehicleRouter } from "./routers/vehicle";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  roads: driverRouter2,

  depots: depotRouter,
  job: jobRouter,
  routePlan: routePlanRouter,
  routeMessaging: solidarityPathwaysMessagingRouter,

  clients: clientRouter,

  driver: driverRouter,
  vehicle: vehicleRouter,
  customer: clientRouterAlt,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
