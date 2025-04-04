"use client";

import { useMemo } from "react";
import { useClient } from "~/providers/client";
import { useDriver } from "~/providers/driver";
import { ChevronRight } from "lucide-react";

import { cn } from "~/lib/utils";

type Props = {
  id: string;
  name: string;
  type: "job" | "vehicle";
  subtitle?: string;
};

export const DataCard = ({ id, name, subtitle, type }: Props) => {
  const { isDriverActive, openDriverEdit } = useDriver();
  const { isJobActive, openJobEdit } = useClient();

  const edit = useMemo(
    () => (type === "job" ? () => openJobEdit(id) : () => openDriverEdit(id)),
    [openJobEdit, openDriverEdit, type, id],
  );

  const isActive = useMemo(
    () => (type === "job" ? isJobActive(id) : isDriverActive(id)),
    [type, isJobActive, isDriverActive, id],
  );

  return (
    <div
      className={cn(
        "flex w-full cursor-pointer items-center justify-between p-3 text-left font-medium shadow odd:bg-slate-300/50 even:bg-slate-100 hover:ring-1 hover:ring-slate-800/30",
        isActive && "odd:bg-indigo-300/50 even:bg-indigo-100",
      )}
      onClick={edit}
      aria-label="Click to edit"
    >
      <span className="group w-10/12 cursor-pointer">
        <h2
          className={cn(
            "text-sm font-bold capitalize",
            isActive ? "text-indigo-800" : "text-slate-800",
          )}
        >
          {name ?? "New Item"}
        </h2>
        {subtitle && (
          <h3
            className={cn(
              "text-xs font-medium text-slate-800/80",
              isActive && "text-indigo-800/80",
            )}
          >
            {subtitle}
          </h3>
        )}
      </span>
      <ChevronRight className="text-slate-800 group-hover:bg-opacity-30" />
    </div>
  );
};
// <DepotCard
//   isActive={isActive}
//   title={name ?? "New Stop"}
//   subtitle={subtitle ?? undefined}
//   onEdit={edit}
// />
