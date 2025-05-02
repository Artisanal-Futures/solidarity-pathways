import { Home, Mail, Phone } from "lucide-react";

import type { DriverVehicleBundle } from "~/lib/validators/driver-vehicle";
import { numberStringToPhoneFormat } from "~/utils/generic/format-utils.wip";
import { SheetDescription } from "~/components/map-sheet";

type Props = {
  activeVehicle: DriverVehicleBundle | null;
};
export const DriverSheetDescription = ({ activeVehicle }: Props) => (
  <SheetDescription className="text-center md:text-left">
    {activeVehicle ? (
      <span className="flex w-full flex-1 flex-col border-b border-t py-4 text-sm">
        <span className="flex items-center gap-2 font-light text-muted-foreground">
          <Home size={15} /> {activeVehicle.driver.address?.formatted}
        </span>
        <span className="flex items-center gap-2 font-light text-muted-foreground">
          <Phone size={15} />{" "}
          {numberStringToPhoneFormat(activeVehicle.driver.phone)}
        </span>
        <span className="flex items-center gap-2 font-light text-muted-foreground">
          <Mail size={15} /> {activeVehicle.driver.email}
        </span>
      </span>
    ) : (
      <span>
        Add drivers to your route plan from existing, or create a new one.
      </span>
    )}
  </SheetDescription>
);
