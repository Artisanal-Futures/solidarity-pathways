"use client";

import type { OptimizedRoutePath } from "~/types/route";
import { useRoutePlans } from "~/hooks/plans/use-route-plans";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { ScrollArea } from "~/components/ui/scroll-area";

import { AssignedJobSheet } from "./assigned-job-sheet";
import { UnassignedJobCard } from "./unassigned-job-card";

export const CalculationsTab = () => {
  const { unassigned, optimized } = useRoutePlans();

  const numberOfUnassigned = unassigned?.length;
  const numberOfNotStarted = optimized.filter(
    (r) => r.status === "NOT_STARTED",
  ).length;
  const numberOfInProgress = optimized.filter(
    (r) => r.status === "IN_PROGRESS",
  ).length;
  const numberOfCompleted = optimized.filter(
    (r) => r.status === "COMPLETED",
  ).length;

  return (
    <>
      <div className="flex flex-col px-4">
        <div className="flex items-center justify-between">
          <h2 className="scroll-m-20 text-xl font-semibold tracking-tight">
            Routes{" "}
            <span className="rounded-lg border border-slate-300 px-2">
              {optimized?.length ?? 0}
            </span>
          </h2>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4">
        <Accordion type="multiple" defaultValue={["item-1"]}>
          <AccordionItem value="item-0">
            <AccordionTrigger className="py-2 text-xs">
              Unassigned ({numberOfUnassigned})
            </AccordionTrigger>
            <AccordionContent>
              {!!unassigned &&
                unassigned?.length > 0 &&
                unassigned?.map((bundle) => {
                  return (
                    <UnassignedJobCard
                      key={bundle.job.id}
                      address={
                        bundle?.job?.address?.formatted ??
                        `Job #${bundle.job.id}`
                      }
                      jobId={bundle.job.id}
                    />
                  );
                })}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-1">
            <AccordionTrigger className="py-2 text-xs">
              Not Started ({numberOfNotStarted})
            </AccordionTrigger>
            <AccordionContent>
              {!!optimized && optimized?.length > 0 && (
                <>
                  {optimized?.map((route) => {
                    if (route.status === "NOT_STARTED")
                      return (
                        <AssignedJobSheet
                          key={route.vehicleId}
                          data={route as OptimizedRoutePath}
                        />
                      );
                  })}
                </>
              )}{" "}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger className="py-2 text-xs">
              In Progress ({numberOfInProgress})
            </AccordionTrigger>
            <AccordionContent>
              {!!optimized && optimized?.length > 0 && (
                <>
                  {optimized?.map((route) => {
                    if (route.status === "IN_PROGRESS")
                      return (
                        <AssignedJobSheet
                          key={route.vehicleId}
                          data={route as OptimizedRoutePath}
                        />
                      );
                  })}
                </>
              )}{" "}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger className="py-2 text-xs">
              Completed ({numberOfCompleted})
            </AccordionTrigger>
            <AccordionContent>
              {!!optimized && optimized?.length > 0 && (
                <>
                  {optimized?.map((route) => {
                    if (route.status === "COMPLETED")
                      return (
                        <AssignedJobSheet
                          key={route.vehicleId}
                          data={route as OptimizedRoutePath}
                        />
                      );
                  })}
                </>
              )}{" "}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </ScrollArea>
    </>
  );
};
