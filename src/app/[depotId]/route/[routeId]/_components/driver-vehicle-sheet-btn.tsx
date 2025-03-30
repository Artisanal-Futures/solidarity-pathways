import { Users } from "lucide-react";

import { useDriverVehicleBundles } from "~/hooks/drivers/use-driver-vehicle-bundles";
import { Button } from "~/components/ui/button";

type Props = { text?: string };

export const DriverVehicleSheetBtn = ({ text = "Manage Drivers" }: Props) => {
  const { onSheetOpenChange } = useDriverVehicleBundles();

  const openDriverVehicleSheet = () => onSheetOpenChange(true);

  return (
    <Button
      variant="outline"
      className="px-3 shadow-none"
      onClick={openDriverVehicleSheet}
    >
      <Users className="mr-2 h-4 w-4" />
      {text}
    </Button>
  );
};
