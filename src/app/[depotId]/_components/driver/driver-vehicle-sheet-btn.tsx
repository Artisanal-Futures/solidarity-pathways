import { useDriver } from "~/providers/driver";
import { Users } from "lucide-react";

import { Button } from "~/components/ui/button";

type Props = { text?: string };

export const DriverVehicleSheetBtn = ({ text = "Manage Drivers" }: Props) => {
  const { onSheetOpenChange } = useDriver();

  const openDriverVehicleSheet = () => onSheetOpenChange(true);

  return (
    <Button
      variant="outline"
      size="sm"
      className="my-1 px-3 shadow-none"
      onClick={openDriverVehicleSheet}
    >
      <Users className="mr-2 h-4 w-4" />
      {text}
    </Button>
  );
};
