import geocodingService from "~/services/autocomplete";
import type {
  DriverVehicleBundle,
  FileUploadHandler,
  VersionOneDriverCSV,
} from "~/types.wip";
import { formatDriverSheetRowToBundle } from "~/utils/driver-vehicle/format-drivers.wip";
import { parseSpreadSheet } from "~/utils/generic/parse-csv.wip";

export const handleDriverSheetUpload: FileUploadHandler<
  DriverVehicleBundle
> = ({ event, setIsLoading, callback }) => {
  setIsLoading(true);

  parseSpreadSheet<VersionOneDriverCSV, DriverVehicleBundle>({
    file: event.target.files![0]!,
    parser: formatDriverSheetRowToBundle,

    onComplete: async (data: DriverVehicleBundle[]) => {
      const revisedDrivers = await Promise.all(
        data.map(async (driverVehicleBundle) => {
          const address = await geocodingService.geocodeByAddress(
            driverVehicleBundle.driver.address.formatted,
          );

          return {
            driver: {
              ...driverVehicleBundle.driver,
              address: {
                // ...driverVehicleBundle.driver.address,
                ...address,
              },
            },
            vehicle: {
              ...driverVehicleBundle.vehicle,
              startAddress: {
                ...address,
              },
              endAddress: {
                ...address,
              },
            },
          };
        }),
      ).catch((err) => {
        console.log(err);
      });

      setIsLoading(false);
      const tableData =
        revisedDrivers?.map((driver) => {
          return {
            name: driver.driver.name,
            address: driver.driver.address.formatted,
            email: driver?.driver?.email ?? "",
          };
        }) ?? [];
      callback({ data: revisedDrivers ?? [], tableData });
    },
  });
};
