import { MapPin } from "lucide-react";

import { useClientJobBundles } from "~/hooks/jobs/use-client-job-bundles";
import { Button } from "~/components/ui/button";

type Props = { text?: string };

export const JobClientSheetBtn = ({ text = "Add Stop" }: Props) => {
  const { onSheetOpenChange } = useClientJobBundles();

  const openJobSheet = () => onSheetOpenChange(true);

  return (
    <Button
      variant="outline"
      className="w-full whitespace-nowrap border-0 px-3 shadow-none"
      onClick={openJobSheet}
    >
      <MapPin className="mr-2 h-4 w-4" />
      {text}
    </Button>
  );
};
