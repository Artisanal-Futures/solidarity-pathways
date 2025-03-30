import type { Prisma } from "@prisma/client";

export type OptimizedRoutePath = Prisma.OptimizedRoutePathGetPayload<{
  include: {
    stops: true;
  };
}>;
