import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { z } from "zod";

import type { Customer } from "~/types/job";
import { geocodeByAddress } from "~/lib/geocode/geocode-address";

export const clientRouter = createTRPCRouter({
  import: protectedProcedure
    .input(z.string())
    .mutation(async ({ input: seedName }) => {
      const clients: Customer[] = [];

      switch (seedName) {
        case "deeplyrooted":
          console.log("pulling from Detroit");
          break;
        case "annarbor":
          console.log("pull from ann arbor");

          const demoStopInformation = [
            {
              name: "Argus Farm Stop",
              address: "1226 Packard St, Ann Arbor, MI 48104",
              email: "dev1@null.com",
              phone: "(734) 997-5448",
              order: "Drop off egg cartons, pick up local food",
              notes: "Say hi to the owners",
            },
            {
              name: "Malletts Creek Branch",
              address: "3090 E Eisenhower Pkwy, Ann Arbor, MI 48108",
              email: "ask@aadl.org",
              phone: "(734) 327-4200",
              order: "Pick up gardening book",
              notes: "",
            },
            {
              name: "Mariah Jones",
              address: "3144 Asher Road, Ann Arbor, MI 48104",
              email: "dev2@null.com",
              phone: "(313) 240-5678",
              order: "Drop off gardening book, local food from Argus",
              notes: "Last time they mentioned planting tomatoes",
            },
          ];

          for (const stopInfo of demoStopInformation) {
            const geocodedData = await geocodeByAddress(stopInfo.address);

            const client: Customer = {
              name: stopInfo.name,
              address: geocodedData.full_address || stopInfo.address,
              email: stopInfo.email,
              phone: stopInfo.phone,
              prep_time: 5,
              service_time: 5,
              priority: 1,
              time_start: "09:00",
              time_end: "17:00",
              lat: geocodedData.lat || 0,
              lon: geocodedData.lon || 0,
              order: stopInfo.order,
              notes: stopInfo.notes,
            };
            clients.push(client);
          }
          break;
        default:
          throw new Error(
            `Unknown Depot magic code name ${seedName}! Can not automatically import clients!`,
          );
      }

      return {
        data: clients,
        message:
          "Example client import completed. deeplyrooted CSV is not implemented yet.",
      };
    }),
});
