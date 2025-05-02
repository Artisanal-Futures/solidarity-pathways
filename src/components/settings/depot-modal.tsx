"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import type { DepotFormData } from "~/lib/validators/depot";
import type { DepotValues } from "~/types/depot";
import { depotFormSchema } from "~/lib/validators/depot";
import { useDepot } from "~/hooks/depot/use-depot";
import { useDepotModal } from "~/hooks/depot/use-depot-modal.wip";
import { Button, buttonVariants } from "~/components/ui/button";
import { Form } from "~/components/ui/form";
import { Modal } from "~/components/modal";

import { AutoCompleteAddressFormField, InputFormField } from "../inputs";

type Props = {
  initialData: DepotValues | null;
};
export const DepotModal = ({ initialData }: Props) => {
  const depotModal = useDepotModal();
  const { createDepot, updateDepot } = useDepot();

  const isLoading = initialData ? updateDepot.isPending : createDepot.isPending;

  const form = useForm<DepotFormData>({
    resolver: zodResolver(depotFormSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      address: {
        formatted: initialData?.address?.formatted ?? undefined,
        latitude: initialData?.address?.latitude ?? undefined,
        longitude: initialData?.address?.longitude ?? undefined,
      },
      magicCode: initialData?.magicCode ?? "",
    },
  });

  const onDepotFormSubmit = (data: DepotFormData) => {
    if (initialData)
      updateDepot.mutate({
        ...data,
        depotId: initialData.id,
      });
    else createDepot.mutate({ ...data });
  };

  return (
    <Modal
      title={initialData ? "Edit Depot" : "Create Depot"}
      description={
        initialData
          ? "Edit your depot details"
          : "Create a new depot to get started with Solidarity Pathways."
      }
      isOpen={depotModal.isOpen}
      onClose={depotModal.onClose}
    >
      <Form {...form}>
        <form
          onSubmit={(e) => void form.handleSubmit(onDepotFormSubmit)(e)}
          className="space-y-4"
        >
          <InputFormField
            form={form}
            disabled={isLoading}
            name="name"
            label="Name"
            placeholder="e.g. Deep Blue Sea Delivery"
            labelClassName="text-sm font-normal text-muted-foreground"
          />
          <InputFormField
            form={form}
            disabled={isLoading}
            name="magicCode"
            label="Magic Code"
            placeholder="e.g. super-secret-code-1234"
            labelClassName="text-sm font-normal text-muted-foreground"
            descriptionClassName="text-xs text-muted-foreground/75"
          />

          <AutoCompleteAddressFormField
            form={form}
            name="address.formatted"
            labelClassName="text-sm font-normal text-muted-foreground"
            label="Depot Address"
            description="Address of the depot. Vehicle starting and ending locations will default to this location."
            defaultValue={
              initialData?.address ?? {
                formatted: "",
                latitude: 0,
                longitude: 0,
              }
            }
          />

          <div className="flex w-full items-center justify-end space-x-2 pt-6">
            {!initialData && (
              <Link
                href="/welcome"
                className={buttonVariants({ variant: "outline" })}
              >
                Nah, I&apos;m good
              </Link>
            )}
            {initialData && (
              <Button
                disabled={isLoading}
                variant="outline"
                onClick={depotModal.onClose}
                type="button"
              >
                Cancel
              </Button>
            )}
            <Button disabled={isLoading} type="submit">
              {initialData ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </Form>
    </Modal>
  );
};
