import { useState } from "react";
import { useDriver } from "~/providers/driver";
import { Bell, Car } from "lucide-react";

import { useSolidarityMessaging } from "~/hooks/use-solidarity-messaging";
import { useSolidarityNotifications } from "~/hooks/use-solidarity-notifications";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

import { useSolidarityState } from "../../hooks/optimized-data/use-solidarity-state";

export const PathwaysNotifications = () => {
  const [open, setOpen] = useState(false);
  const solidarityNotifications = useSolidarityNotifications();

  const { setActiveDriverId, findDriverByEmail } = useDriver();
  const { messageDepotById, messageDriverById } = useSolidarityMessaging();
  const { pathId } = useSolidarityState();

  const updateMessageThread = async ({
    profileId,
    channelId,
    name,
  }: {
    profileId: string;
    channelId: string;
    name: string;
  }) => {
    solidarityNotifications.updateOtherMessageStatus({
      channelId,
      profileId,
    });
    const driver = await findDriverByEmail(name);
    setActiveDriverId(driver?.vehicle.id ?? null);
    pathId ? messageDepotById(channelId) : messageDriverById(channelId);
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size={"icon"}
          className="relative aspect-square"
        >
          <Bell />{" "}
          {solidarityNotifications.unread.totalUnread > 0 && (
            <span className="absolute right-0 top-0 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-screen-sm">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Notifications</h4>
            <p className="text-sm text-muted-foreground">
              Messages from drivers and other important stuff
            </p>
          </div>{" "}
        </div>
        <div className="mt-4 flex flex-col space-y-2 border-t border-t-slate-100">
          {solidarityNotifications.unread.totalUnread > 0 &&
            solidarityNotifications.unread.channelsByServer.map((bundle) => (
              <Button
                className="group flex h-auto justify-start gap-2 text-sm font-semibold even:bg-slate-100"
                key={bundle.channel.id}
                variant={"ghost"}
                onClick={() =>
                  updateMessageThread({
                    profileId: bundle.profileId!,
                    channelId: bundle?.channel?.id,
                    name: bundle.channel.name,
                  })
                }
              >
                <span className="aspect-square h-fit rounded-full border bg-slate-100 p-2 group-even:bg-slate-200">
                  <Car className="h-6 w-6" />
                </span>

                <p className="flex flex-col text-left">
                  <span>
                    You have {bundle.unreadMessages.length} new messages
                    from{" "}
                  </span>
                  <span>
                    {" "}
                    {pathId ? `Depot: ${bundle.depot}` : bundle.channel.name}
                  </span>
                </p>
              </Button>
            ))}
          {solidarityNotifications.unread.totalUnread === 0 && (
            <p className="text-xs text-muted-foreground">
              No new notifications
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
