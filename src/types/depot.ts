import type { Prisma } from "@prisma/client";

export type DepotValues = Prisma.DepotGetPayload<{
  include: {
    address: true;
  };
}>;
