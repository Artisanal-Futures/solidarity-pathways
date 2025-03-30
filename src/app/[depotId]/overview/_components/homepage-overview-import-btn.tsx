import type { LucideIcon } from "lucide-react";
import { CheckCircleIcon } from "lucide-react";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

export type HomePageImportBtnProps = {
  Icon: LucideIcon;
  caption: string;
  isProcessed?: boolean;
  isDisabled?: boolean;
};

export const HomePageOverviewImportBtn = ({
  isProcessed,
  Icon,
  caption,
  isDisabled,
}: HomePageImportBtnProps) => (
  <Button
    disabled={isDisabled}
    className={cn(
      "relative flex h-auto w-full cursor-default flex-col items-center rounded-xl border bg-muted text-card-foreground shadow transition-colors first-line:p-6 hover:bg-muted/25 sm:p-10",
      !isProcessed && "cursor-pointer bg-card hover:bg-muted/50",
    )}
  >
    <Icon className="h-10 w-10" />

    {isProcessed && (
      <CheckCircleIcon className="h-15 w-15 absolute right-3 top-3 fill-green-500 text-white" />
    )}

    <p className="mt-2 text-center font-medium">{caption}</p>
  </Button>
);
