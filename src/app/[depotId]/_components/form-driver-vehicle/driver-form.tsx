import { useEffect, useState } from "react";
import { formatDriverFormDataToBundle } from "~/utils/driver-vehicle/format-drivers.wip";
import {
  metersToMiles,
  phoneFormatStringToNumber,
  secondsToMinutes,
  unixSecondsToMilitaryTime,
} from "~/utils/generic/format-utils.wip";
import { uniqueId } from "lodash";
import { FileCog, Pencil, Trash } from "lucide-react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import type { DriverFormValues } from "~/lib/validators/driver-form";
import type { DriverVehicleBundle } from "~/lib/validators/driver-vehicle";
import type { Coordinates } from "~/types/geolocation";
import { cn } from "~/lib/utils";
import { driverFormSchema } from "~/lib/validators/driver-form";
import { useDriverVehicleBundles } from "~/hooks/drivers/use-driver-vehicle-bundles";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { Accordion } from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { Form } from "~/components/ui/form";
import { AlertModal } from "~/components/alert-modal";

import { DriverDetailsSection } from "./driver-details.form";
import { ShiftDetailsSection } from "./shift-details.form";
import { VehicleDetailsSection } from "./vehicle-details.form";

type Props = {
  handleOnOpenChange: (data: boolean) => void;
  activeDriver?: DriverVehicleBundle | null;
};

export const DriverForm = ({ handleOnOpenChange, activeDriver }: Props) => {
  const {
    updateVehicleDetailsMutation,
    updateDriverDetailsMutation,
    updateDriverDefaultsMutation,
    updateDriverChannelMutation,
  } = useDriverVehicleBundles();

  const { routeId, depotId } = useSolidarityState();

  const { createVehicleBundles, deleteVehicleMutation } =
    useDriverVehicleBundles();

  const [open, setOpen] = useState(false);
  const [editDriver, setEditDriver] = useState(false);

  const { status } = useSession();

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
      } as Coordinates & { formatted: string },

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

      shiftStart: activeDriver?.vehicle.shiftStart
        ? unixSecondsToMilitaryTime(activeDriver?.vehicle.shiftStart)
        : "09:00",
      shiftEnd: activeDriver?.vehicle.shiftEnd
        ? unixSecondsToMilitaryTime(activeDriver?.vehicle.shiftEnd)
        : "17:00",

      breaks:
        activeDriver?.vehicle.breaks && activeDriver?.vehicle.breaks.length > 0
          ? activeDriver?.vehicle.breaks.map((b) => ({
              ...b,
              duration: secondsToMinutes(b.duration),
            }))
          : [{ id: Number(uniqueId()), duration: 30 }],
      maxTravelTime: secondsToMinutes(
        activeDriver?.vehicle?.maxTravelTime ?? 300,
      ),
      maxTasks: activeDriver?.vehicle.maxTasks ?? 100,
      maxDistance: Math.round(
        metersToMiles(activeDriver?.vehicle.maxDistance ?? 100),
      ),
      capacity: 100,
    },
  });

  useEffect(() => {
    setTimeout(() => {
      document.body.style.pointerEvents = "";
    }, 500);
  }, []);

  function onSubmit(data: DriverFormValues) {
    if (activeDriver) {
      updateVehicleDetailsMutation.mutate({
        vehicle: formatDriverFormDataToBundle(data).vehicle,
        routeId,
      });
      if (editDriver) {
        updateDriverChannelMutation.mutate({
          email: data.email,
          channelName: activeDriver?.driver?.email,
          depotId,
        });
        updateDriverDetailsMutation.mutate({
          driver: formatDriverFormDataToBundle(data).driver,
        });
      }
    } else
      createVehicleBundles.mutate({
        data: [formatDriverFormDataToBundle(data)],
        depotId,
        routeId,
      });

    handleOnOpenChange(false);
  }

  const onDelete = () => {
    if (!!activeDriver?.vehicle.id) {
      deleteVehicleMutation.mutate(activeDriver?.vehicle.id);
    }

    handleOnOpenChange(false);
  };

  const updateDefault = (data: DriverFormValues) => {
    const temp = formatDriverFormDataToBundle(data);

    if (!!activeDriver?.driver?.defaultVehicleId) {
      updateDriverDefaultsMutation.mutate({
        defaultId: activeDriver?.driver?.defaultVehicleId,
        bundle: temp,
        depotId,
      });
    }
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onDelete}
        loading={false}
      />

      <Form {...form}>
        <form
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
          className="flex h-full max-h-[calc(100vh-50vh)] w-full flex-col space-y-8 md:h-[calc(100vh-15vh)] lg:flex-grow"
        >
          {activeDriver && (
            <div className="flex w-full flex-col gap-3 border-b bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <Button type="submit" className="flex-1">
                  {activeDriver ? "Update" : "Add"} route vehicle
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant={"destructive"}
                  onClick={() => setOpen(true)}
                >
                  <Trash className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            </div>
          )}

          {!activeDriver && (
            <div className="flex w-full flex-col gap-3 border-b bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                {status === "authenticated" && (
                  <Button type="submit" className="flex-1" variant={"outline"}>
                    Save driver to depot
                  </Button>
                )}

                <Button type="submit" className="flex-1">
                  Add driver
                </Button>
              </div>
            </div>
          )}

          <div className="flex-1">
            <Accordion
              type="single"
              collapsible
              className="flex h-full w-full flex-col px-4"
              value={accordionValue}
              onValueChange={setAccordionValue}
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
