"use client";

import { useState } from "react";
import { uniqueId } from "lodash";
import { FileCog, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import type { DriverFormValues } from "~/lib/validators/driver-form";
import type { DriverVehicleBundle } from "~/lib/validators/driver-vehicle";
import { formatDriverFormDataToBundle } from "~/utils/driver-vehicle/format-drivers.wip";
import {
  metersToMiles,
  phoneFormatStringToNumber,
  secondsToMinutes,
  unixSecondsToMilitaryTime,
} from "~/utils/generic/format-utils.wip";
import { cn } from "~/lib/utils";
import { driverFormSchema } from "~/lib/validators/driver-form";
import { api } from "~/trpc/react";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { useDefaultMutationActions } from "~/hooks/use-default-mutation-actions";
import { useFixDismissibleLayer } from "~/hooks/use-fix-dismissible-layer";
import { Accordion } from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { Form } from "~/components/ui/form";
import { DeleteDialog } from "~/components/delete-dialog";
import { LoadButton } from "~/components/shared/load-button";

import { DriverDetailsSection } from "./driver-details.form";
import { ShiftDetailsSection } from "./shift-details.form";
import { VehicleDetailsSection } from "./vehicle-details.form";

type Props = {
  handleOnOpenChange: (data: boolean) => void;
  activeDriver?: DriverVehicleBundle | null;
};

export const DriverForm = ({ handleOnOpenChange, activeDriver }: Props) => {
  const { routeId, depotId } = useSolidarityState();

  const { defaultActions } = useDefaultMutationActions({
    invalidateEntities: ["driver", "vehicle", "routePlan"],
  });

  const createDriver = api.driver.create.useMutation(defaultActions);
  const deleteVehicle = api.vehicle.delete.useMutation(defaultActions);
  const updateVehicle = api.vehicle.update.useMutation(defaultActions);
  const updateDriver = api.driver.update.useMutation(defaultActions);

  const [editDriver, setEditDriver] = useState(false);

  const [accordionValue, setAccordionValue] = useState(
    activeDriver ? "item-2" : "item-1",
  );

  const form = useForm<DriverFormValues>({
    resolver: zodResolver(driverFormSchema),
    defaultValues: {
      id: activeDriver?.driver?.id ?? uniqueId("driver_"),
      vehicleId: activeDriver?.vehicle.id ?? uniqueId("vehicle_"),
      startAddressId: activeDriver?.vehicle.startAddressId ?? uniqueId("addr_"),
      addressId: activeDriver?.driver.addressId ?? uniqueId("addr_"),
      type: activeDriver?.driver?.type ?? "TEMP",
      name: activeDriver?.driver?.name ?? "",
      email: activeDriver?.driver?.email ?? "",
      phone: phoneFormatStringToNumber(activeDriver?.driver?.phone ?? ""),
      address: {
        formatted: activeDriver?.driver.address.formatted ?? undefined,
        latitude: activeDriver?.driver.address.latitude ?? undefined,
        longitude: activeDriver?.driver.address.longitude ?? undefined,
      },
      startAddress: {
        formatted: activeDriver?.vehicle.startAddress.formatted ?? undefined,
        latitude: activeDriver?.vehicle.startAddress.latitude ?? undefined,
        longitude: activeDriver?.vehicle.startAddress.longitude ?? undefined,
      },
      endAddress: {
        formatted: activeDriver?.vehicle?.endAddress?.formatted ?? undefined,
        latitude: activeDriver?.vehicle?.endAddress?.latitude ?? undefined,
        longitude: activeDriver?.vehicle?.endAddress?.longitude ?? undefined,
      },

      shiftStart:
        unixSecondsToMilitaryTime(activeDriver?.vehicle.shiftStart) ?? "09:00",
      shiftEnd:
        unixSecondsToMilitaryTime(activeDriver?.vehicle.shiftEnd) ?? "17:00",

      breaks:
        activeDriver?.vehicle.breaks && activeDriver?.vehicle.breaks.length > 0
          ? activeDriver?.vehicle.breaks.map((b) => ({
              ...b,
              duration: secondsToMinutes(b.duration) ?? 30,
            }))
          : [{ id: Number(uniqueId()), duration: 30 }],
      maxTravelTime:
        secondsToMinutes(activeDriver?.vehicle?.maxTravelTime) ?? 30,
      maxTasks: activeDriver?.vehicle.maxTasks ?? 100,
      maxDistance: Math.round(
        metersToMiles(activeDriver?.vehicle.maxDistance ?? 100),
      ),
      capacity: 100,
    },
  });

  useFixDismissibleLayer();

  const onSubmit = async (data: DriverFormValues) => {
    const bundle = formatDriverFormDataToBundle(data);

    if (!activeDriver) {
      await createDriver.mutateAsync({
        data: bundle,
        depotId,
        routeId,
      });
      handleOnOpenChange(false);
      return;
    }

    await updateVehicle.mutateAsync({
      ...bundle.vehicle,
      routeId,
    });

    if (editDriver) {
      await updateDriver.mutateAsync({
        driver: bundle.driver,
      });
    }

    handleOnOpenChange(false);
  };

  const onDelete = () => {
    if (!!activeDriver?.vehicle.id) {
      deleteVehicle.mutate(activeDriver?.vehicle.id);
    }

    handleOnOpenChange(false);
  };

  const updateDefault = (data: DriverFormValues) => {
    const temp = formatDriverFormDataToBundle(data);

    if (!!activeDriver?.driver?.defaultVehicleId) {
      updateVehicle.mutate({
        ...temp.vehicle,
        id: activeDriver?.driver?.defaultVehicleId,
        routeId,
      });
    }
  };

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
          className="flex h-full max-h-[calc(100vh-50vh)] w-full flex-col space-y-8 md:h-[calc(100vh-15vh)] lg:flex-grow"
        >
          {activeDriver && (
            <div className="flex w-full flex-col gap-3 border-b bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <LoadButton
                  type="submit"
                  className="flex-1"
                  isLoading={updateVehicle.isPending || updateDriver.isPending}
                >
                  {activeDriver ? "Update" : "Add"} route vehicle
                </LoadButton>
                <DeleteDialog onConfirm={onDelete} />
              </div>
            </div>
          )}

          {!activeDriver && (
            <div className="flex w-full flex-col gap-3 border-b bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <LoadButton
                  type="submit"
                  className="flex-1"
                  isLoading={createDriver.isPending}
                >
                  Add driver
                </LoadButton>
              </div>
            </div>
          )}

          <div className="flex-1">
            <Accordion
              type="single"
              collapsible
              className="flex h-full w-full flex-col px-4"
              value={accordionValue}
              onValueChange={(value) => {
                setAccordionValue(value);
              }}
            >
              {(!activeDriver || editDriver) && (
                <DriverDetailsSection form={form} />
              )}
              <VehicleDetailsSection form={form} />

              <ShiftDetailsSection form={form} />
            </Accordion>
          </div>
        </form>
      </Form>

      {activeDriver && (
        <div className="mt-auto w-full flex-col gap-2 space-y-0.5 border-t pt-4">
          <div className="flex w-full">
            <Button
              variant={"link"}
              type="button"
              className="m-0 items-center gap-1 p-0"
              onClick={() => updateDefault(form.getValues())}
            >
              <FileCog className="h-4 w-4" />
              Set as default for {activeDriver?.driver.name}
            </Button>
          </div>
          <div className="flex w-full">
            <Button
              variant={"link"}
              className={cn(
                "m-0 items-center gap-1 p-0",
                editDriver && "hidden",
              )}
              onClick={() => {
                setEditDriver((prev) => !prev);
                setAccordionValue("item-1");
              }}
            >
              <Pencil className="h-4 w-4" />
              Edit details for {activeDriver?.driver.name}
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
