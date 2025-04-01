import { uniqueId } from "lodash";

import type { DriverVehicleBundle } from "~/lib/validators/driver-vehicle";
import type { UploadOptions } from "~/types/misc";
import { handleDriverSheetUpload } from "~/utils/driver-vehicle/parse-drivers.wip";
import {
  milesToMeters,
  militaryTimeToUnixSeconds,
  minutesToSeconds,
} from "~/utils/generic/format-utils.wip";
import { driverTypeSchema } from "~/lib/validators/driver-vehicle";

type Props = {
  drivers: DriverVehicleBundle[];
  setDrivers: ({
    drivers,
    addToRoute,
  }: {
    drivers: DriverVehicleBundle[];
    addToRoute?: boolean;
  }) => void;
};

export const driverVehicleDataForNewLatLng = (
  lat: number,
  lng: number,
): DriverVehicleBundle => {
  return {
    driver: {
      type: "FULL_TIME",
      id: uniqueId("driver_"),
      name: "New Driver",
      email: "default@example.com",
      phone: "",

      address: {
        formatted: "Address via LatLng",
        latitude: lat,
        longitude: lng,
      },
    },
    vehicle: {
      id: uniqueId("vehicle_"),
      startAddress: {
        formatted: "Address via LatLng",
        latitude: lat,
        longitude: lng,
      },
      endAddress: {
        formatted: "Address via LatLng",
        latitude: lat,
        longitude: lng,
      },
      type: driverTypeSchema.parse("TEMP"),
      shiftStart: driverVehicleDefaults.shiftStart,
      shiftEnd: driverVehicleDefaults.shiftEnd,
      breaks: driverVehicleDefaults.breaks,
      capacity: driverVehicleDefaults.capacity,
      maxTravelTime: driverVehicleDefaults.maxTravelTime,
      maxTasks: driverVehicleDefaults.maxTasks,
      maxDistance: driverVehicleDefaults.maxDistance,

      notes: "",
      cargo: "",
    },
  };
};

export const driverVehicleDefaults = {
  shiftStart: militaryTimeToUnixSeconds("09:00"),
  shiftEnd: militaryTimeToUnixSeconds("17:00"),
  breaks: [
    {
      id: parseInt(uniqueId()),
      duration: minutesToSeconds(30),
      start: militaryTimeToUnixSeconds("09:00"),
      end: militaryTimeToUnixSeconds("09:00"),
    },
  ],
  capacity: 10,
  maxTravelTime: minutesToSeconds(60),
  maxTasks: 10,
  maxDistance: milesToMeters(100),
  notes: "",
  cargo: "",
};

export const driverVehicleUploadOptions = ({
  drivers,
  setDrivers,
}: Props): UploadOptions<DriverVehicleBundle> => ({
  type: "driver" as keyof DriverVehicleBundle,
  parseHandler: handleDriverSheetUpload,
  handleAccept: ({ data }) => {
    setDrivers({
      drivers: data,
      addToRoute: false,
    });
  },
  currentData: drivers,
});
