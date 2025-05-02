import { useClient } from "~/providers/client";
import { Pencil } from "lucide-react";

import { cn } from "~/lib/utils";
import { Card, CardHeader, CardTitle } from "~/components/ui/card";

type Props = {
  address: string;
  jobId: string;
};
export const UnassignedJobCard = ({ address, jobId }: Props) => {
  const { openJobEdit } = useClient();
  const editUnassigned = () => openJobEdit(jobId);

  return (
    <Card
      className={cn("my-2 w-full hover:bg-slate-50")}
      onClick={editUnassigned}
    >
      <CardHeader
        className={cn(
          "flex w-full cursor-pointer flex-row items-center justify-between py-2 shadow-inner",
        )}
      >
        <CardTitle className="flex w-full flex-row items-center justify-between text-xs font-bold text-black">
          {address}
          <Pencil className="h-4 w-4 text-slate-800 group-hover:bg-opacity-30" />
        </CardTitle>
      </CardHeader>
    </Card>
  );
};
