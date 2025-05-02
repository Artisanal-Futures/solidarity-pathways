"use client";

import { User } from "lucide-react";
import type { Session } from "next-auth";
import { signOut } from "next-auth/react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";

export const SessionDropDownMenu = ({
  hasSession,
  sessionData,
  isMobile,
}: {
  hasSession: boolean;
  sessionData: Session | null;
  isMobile?: boolean;
}) => {
  if (!hasSession) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "relative h-8 w-8 rounded-full",
            isMobile &&
              "h-10 w-fit gap-2 rounded-md text-left hover:bg-zinc-50 hover:text-black",
          )}
        >
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={sessionData?.user?.image ?? ""}
              alt={`@${sessionData?.user?.name}`}
            />
            <AvatarFallback>
              <User />
            </AvatarFallback>
          </Avatar>

          <span className={cn("", !isMobile && "sr-only")}>
            {sessionData?.user?.name}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 !border border-zinc-50 bg-white text-black !shadow-lg"
        align="end"
        forceMount
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium leading-none">
                {sessionData?.user?.name}
              </p>
            </div>
            <p className="text-xs leading-none text-muted-foreground">
              {sessionData?.user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-50" />

        <DropdownMenuItem
          onClick={() => void signOut()}
          className="hover:bg-zinc-50 hover:text-black focus:bg-zinc-50 focus:text-black"
        >
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
