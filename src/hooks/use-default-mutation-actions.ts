"use client";

import { useRouter } from "next/navigation";
import { type AppRouter } from "~/server/api/root";

import { toastService } from "@dreamwalker-studios/toasts";
import { type TRPCClientErrorLike } from "@trpc/client";

import { api } from "../trpc/react";

// Get all valid router keys from the API
type Entity = keyof AppRouter["_def"]["procedures"];

type Props = {
  invalidateEntities: Entity[];
  errorMessageTemplate?: string;
  redirectPath?: string;
};

export const useDefaultMutationActions = ({ invalidateEntities }: Props) => {
  const apiContext = api.useUtils();
  const router = useRouter();

  const defaultSettled = () => {
    invalidateEntities.forEach((entity) => {
      void apiContext[entity].invalidate();
    });

    router.refresh();
  };

  const defaultError = (error: TRPCClientErrorLike<AppRouter>) => {
    toastService.error({
      message:
        error?.message ??
        `Something went wrong with this operation. Please try again later.`,
      error,
    });

    console.error(error);
  };

  const defaultSuccess = (props: { message: string }) => {
    toastService.success(props.message);
  };

  const defaultActions = {
    onSuccess: defaultSuccess,
    onError: defaultError,
    onSettled: defaultSettled,
  };

  return {
    defaultActions,
    defaultError,
    defaultSettled,
    defaultSuccess,

    onSettled: defaultSettled,
    onError: defaultError,
    onSuccess: defaultSuccess,
  };
};
