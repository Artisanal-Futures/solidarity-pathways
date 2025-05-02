"use client";

import type { UseFormReturn } from "react-hook-form";
import { useState } from "react";
import { useClient } from "~/providers/client";
import { Edit, UserPlus } from "lucide-react";

import { toastService } from "@dreamwalker-studios/toasts";

import type { StopFormValues } from "~/lib/validators/stop";
import { findCustomerById } from "~/lib/helpers/find-customer-by-id";
import { checkAndHighlightErrors } from "~/lib/helpers/highlight-errors";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import {
  AutoCompleteAddressFormField,
  InputFormField,
  SelectFormField,
  TextareaFormField,
} from "~/components/inputs";

interface Address {
  formatted?: string;
  latitude?: number;
  longitude?: number;
}

interface ClientDetailsSectionProps {
  form: UseFormReturn<StopFormValues>;
  editClient: boolean;
  onClientModeChange?: (mode: "select" | "create" | "edit") => void;
}

export const ClientDetailsSection = ({
  form,
  editClient,
  onClientModeChange,
}: ClientDetailsSectionProps) => {
  const highlightErrors = checkAndHighlightErrors({
    form,
    keys: ["clientAddress.formatted", "name", "email", "phone", "notes"],
  });

  const { depotId, depotMode } = useSolidarityState();
  const [clientMode, setClientMode] = useState<"select" | "create" | "edit">(
    editClient ? "edit" : "select",
  );
  const [isEditing, setIsEditing] = useState(editClient);
  const [previousClientId, setPreviousClientId] = useState<string | undefined>(
    form.getValues("clientId"),
  );

  const { activeJobData } = useClient();
  const getDepotClients = api.customer.getAll.useQuery(depotId, {
    enabled: !!depotId && !!depotMode && depotMode !== "calculate",
  });

  const isClientAssigned = form.watch("clientId") !== undefined;
  const isNewJob = !activeJobData;
  const clientAddress = form.watch("clientAddress");
  const clientName = form.watch("name");
  const isJobNumberName = form.watch("id")?.includes("job_");

  const handleClientSelect = (clientId: string) => {
    const selectedClient = getDepotClients?.data?.find(
      (c) => c.id === clientId,
    );
    if (selectedClient) {
      form.setValue("clientId", clientId);
      form.setValue("name", selectedClient.name);
      form.setValue("email", selectedClient.email ?? undefined);
      form.setValue("phone", selectedClient.phone ?? undefined);
      if (selectedClient.address) {
        form.setValue("clientAddress", {
          formatted: selectedClient.address.formatted,
          latitude: selectedClient.address.latitude,
          longitude: selectedClient.address.longitude,
        });
      }
      setClientMode("select");
      onClientModeChange?.("select");
    }
  };

  const handleCreateNewClient = () => {
    setPreviousClientId(form.getValues("clientId"));
    form.setValue("clientId", undefined);
    form.setValue("name", "");
    form.setValue("email", undefined);
    form.setValue("phone", undefined);
    form.setValue("clientAddress", {
      formatted: "",
      latitude: 0,
      longitude: 0,
    });
    setClientMode("create");
    onClientModeChange?.("create");
  };

  const handleCancelCreate = () => {
    if (previousClientId) {
      const previousClient = getDepotClients?.data?.find(
        (c) => c.id === previousClientId,
      );
      if (previousClient) {
        form.setValue("clientId", previousClientId);
        form.setValue("name", previousClient.name);
        form.setValue("email", previousClient.email ?? undefined);
        form.setValue("phone", previousClient.phone ?? undefined);
        if (previousClient.address) {
          form.setValue("clientAddress", {
            formatted: previousClient.address.formatted,
            latitude: previousClient.address.latitude,
            longitude: previousClient.address.longitude,
          });
        }
      }
    }
    setClientMode("select");
    onClientModeChange?.("select");
  };

  const handleEditClient = () => {
    setIsEditing(true);
    setClientMode("edit");
    onClientModeChange?.("edit");
  };

  const handleCancelEdit = () => {
    const currentClientId = form.getValues("clientId");
    if (currentClientId) {
      const currentClient = getDepotClients?.data?.find(
        (c) => c.id === currentClientId,
      );
      if (currentClient) {
        form.setValue("name", currentClient.name);
        form.setValue("email", currentClient.email ?? undefined);
        form.setValue("phone", currentClient.phone ?? undefined);
        if (currentClient.address) {
          form.setValue("clientAddress", {
            formatted: currentClient.address.formatted,
            latitude: currentClient.address.latitude,
            longitude: currentClient.address.longitude,
          });
        }
      }
    }
    setIsEditing(false);
    setClientMode("select");
    onClientModeChange?.("select");
  };

  const showClientForm = () => clientMode === "create" || clientMode === "edit";

  return (
    <AccordionItem value="item-2">
      <AccordionTrigger>Client Details</AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          {/* Selection Mode */}
          {clientMode === "select" && (
            <>
              <SelectFormField
                form={form}
                name="clientId"
                label="Select Previous Client"
                placeholder="Select a client"
                values={
                  getDepotClients?.data?.map((client) => ({
                    label: client.name,
                    value: client.id,
                  })) ?? []
                }
                onValueChange={handleClientSelect}
                disabled={isEditing}
              />

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCreateNewClient}
                >
                  Create New Client
                </Button>
                {form.getValues("clientId") && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleEditClient}
                  >
                    Edit Current Client
                  </Button>
                )}
              </div>
            </>
          )}

          {/* Create/Edit Mode */}
          {(clientMode === "create" || clientMode === "edit") && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">
                  {clientMode === "create"
                    ? "Create New Client"
                    : "Edit Client"}
                </h3>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={
                    clientMode === "create"
                      ? handleCancelCreate
                      : handleCancelEdit
                  }
                >
                  Cancel
                </Button>
              </div>

              <InputFormField
                form={form}
                name="name"
                label="Full Name"
                placeholder="Client's full name"
                labelClassName="text-sm font-normal text-muted-foreground"
              />

              <AutoCompleteAddressFormField
                form={form}
                name="clientAddress.formatted"
                labelClassName="text-sm font-normal text-muted-foreground"
                label="Home Address"
                description="This is where the client typically is located."
                defaultValue={{
                  formatted: clientAddress?.formatted ?? "",
                  latitude: clientAddress?.latitude ?? 0,
                  longitude: clientAddress?.longitude ?? 0,
                }}
                onSelectAdditional={(address) => {
                  form.setValue("address", address);
                }}
              />

              <InputFormField
                form={form}
                name="email"
                label="Email"
                type="email"
                placeholder="e.g. client@example.com"
                labelClassName="text-sm font-normal text-muted-foreground"
              />

              <InputFormField
                form={form}
                name="phone"
                label="Phone"
                placeholder="e.g. (555) 123-4567"
                labelClassName="text-sm font-normal text-muted-foreground"
              />

              <TextareaFormField
                form={form}
                name="notes"
                label="Notes (optional)"
                placeholder="e.g. Special delivery instructions"
                labelClassName="text-sm font-normal text-muted-foreground"
              />

              {clientMode === "edit" && (
                <p className="text-sm text-muted-foreground">
                  Changes will be saved when you update the stop. Click
                  &quot;Cancel&quot; to discard changes.
                </p>
              )}
            </>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
