import type { LucideIcon } from "lucide-react";
import { User } from "lucide-react";

import { cn } from "~/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";

type Props = {
  content: string;
  time: string;
  type: "sender" | "receiver";
  Icon?: LucideIcon;
};

export const Message = ({ content, time, type, Icon }: Props) => {
  return (
    <>
      <div
        className={cn(
          "flex items-start gap-4",
          type === "sender" && "ml-auto items-end",
        )}
      >
        <div className="relative h-12 w-12">
          {type === "receiver" && (
            <Avatar>
              <AvatarImage src="" />
              <AvatarFallback className="bg-white">
                {Icon ? <Icon /> : <User />}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
        <div
          className={cn(
            "flex max-w-[60vw] flex-1 flex-col gap-2 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-950 lg:max-w-[22vw]",
            type === "receiver" && "max-w-[60vw] lg:max-w-[22vw]",
          )}
        >
          <p>{content}</p>
          <time className="text-sm text-gray-500 dark:text-gray-400">
            {time}
          </time>
        </div>
      </div>
    </>
  );
};
