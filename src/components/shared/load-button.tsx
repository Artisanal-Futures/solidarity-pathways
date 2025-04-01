import type { LucideIcon } from "lucide-react";
import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

import type { ButtonProps } from "~/components/ui/button";
import { Button } from "~/components/ui/button";

interface LoadButtonProps extends ButtonProps {
  isLoading: boolean;
  loadingText?: string;
  Icon?: LucideIcon;
}

export const LoadButton = forwardRef<HTMLButtonElement, LoadButtonProps>(
  ({ isLoading, loadingText, Icon, children, ...props }, ref) => {
    return (
      <Button {...props} disabled={isLoading || props.disabled} ref={ref}>
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          Icon && <Icon className="mr-2 size-4" />
        )}
        {isLoading ? (loadingText ?? "Loading...") : children}
      </Button>
    );
  },
);

LoadButton.displayName = "LoadButton";
