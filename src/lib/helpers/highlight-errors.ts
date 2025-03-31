import type { UseFormReturn } from "react-hook-form";

type Props<T extends Record<string, unknown>> = {
  form: UseFormReturn<T>;
  keys: Array<keyof T | string>;
};

export const checkAndHighlightErrors = <T extends Record<string, unknown>>({
  form,
  keys,
}: Props<T>) => {
  const formErrors = form.formState.errors;

  const hasErrors = keys.some(
    (key) => formErrors[key as keyof typeof formErrors],
  );

  return hasErrors;
};
