"use client";

import { User } from "lucide-react";
import { signIn } from "next-auth/react";
import { forwardRef } from "react";
import { Button, type ButtonProps } from "~/components/ui/button";
import { cn } from "~/lib/utils";

type Props = {
  hasSession: boolean;
} & ButtonProps;
export const SignInButton = forwardRef<HTMLButtonElement, Props>(
  ({ hasSession, className, children, ...props }, ref) => {
    if (hasSession) return null;
    return (
      <Button
        ref={ref}
        variant={"outline"}
        onClick={() => void signIn()}
        className={cn(className)}
        {...props}
      >
        {children ? (
          <>{children}</>
        ) : (
          <>
            <span className="max-lg:hidden"> Sign in</span>{" "}
            <User className="hidden max-lg:flex" />
          </>
        )}
      </Button>
    );
  },
);

SignInButton.displayName = "SignInButton";
