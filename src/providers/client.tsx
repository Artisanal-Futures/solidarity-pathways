"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useStopsStore } from "~/stores/use-stops-store";

import type { ClientJobBundle } from "~/lib/validators/client-job";
import { checkIfJobExistsInRoute } from "~/lib/helpers/get-specfiic";
import { api } from "~/trpc/react";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { useUrlParams } from "~/hooks/use-url-params";

type ClientContextType = {
  activeJobId: string | null;
  setActiveJobId: (id: string | null) => Promise<void>;
  isJobActive: (id: string) => boolean;
  activeJobData: ClientJobBundle | null;
  isLoading: boolean;
  openJobEdit: (id: string) => void;
  openViewJob: (id: string | null) => void;
  isJobSheetOpen: boolean;
  setIsJobSheetOpen: (open: boolean) => void;
  isFieldJobSheetOpen: boolean;
  setIsFieldJobSheetOpen: (open: boolean) => void;
  onFieldJobSheetOpen: (open: boolean) => void;
  jobSheetMode: string;
  setJobSheetMode: (mode: string) => void;
  createNewJob: () => void;
  addPreviousJob: () => void;
  onSheetOpenChange: (open: boolean) => void;
  findJobById: (id: string) => ClientJobBundle | null;
  setActiveJob: (job: ClientJobBundle) => void;
  routeJobs: ClientJobBundle[];
};

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const ClientProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { updateUrlParams } = useUrlParams();
  const { routeId } = useSolidarityState();
  const stopsStore = useStopsStore();
  const [isLoading, setIsLoading] = useState(false);

  const getJobs = api.job.getAllFromRoute.useQuery(routeId, {
    enabled: !!routeId,
  });

  const findJobById = (id: string): ClientJobBundle | null => {
    if (!id) return null;
    const job = checkIfJobExistsInRoute({
      id,
      routeJobs: getJobs.data ?? [],
    });
    return job;
  };

  const setActiveJob = (job: ClientJobBundle) => {
    console.log("setting active job", job);
    stopsStore.setActiveLocation(job);
  };

  const setActiveJobId = (id: string | null) => {
    setIsLoading(true);
    updateUrlParams({ key: "jobId", value: id });

    if (id) {
      const job = checkIfJobExistsInRoute({
        id,
        routeJobs: getJobs.data ?? [],
      });

      if (job) {
        setActiveJob(job);
        stopsStore.setIsStopSheetOpen(true);
      } else {
        stopsStore.setIsStopSheetOpen(false);
      }
    } else {
      stopsStore.setIsStopSheetOpen(false);
    }

    setIsLoading(false);
  };

  const isJobActive = (id: string) => {
    return stopsStore.activeLocation?.job.id === id;
  };

  const openJobEdit = (id: string) => {
    void setActiveJobId(id);
    stopsStore.setActiveLocationById(id);
    stopsStore.setIsStopSheetOpen(true);
  };

  const openViewJob = (id: string | null) => {
    if (id) {
      void setActiveJobId(id);
      stopsStore.setActiveLocationById(id);
    }
    stopsStore.setIsFieldJobSheetOpen(true);
  };

  const onSheetOpenChange = (open: boolean) => {
    if (!open) void setActiveJobId(null);
    stopsStore.setIsStopSheetOpen(open);
  };

  const onFieldJobSheetOpen = (open: boolean) => {
    if (!open) void setActiveJobId(null);
    stopsStore.setIsFieldJobSheetOpen(open);
  };

  const createNewJob = () => {
    stopsStore.setJobSheetMode("create-new");
    stopsStore.setActiveLocationById(null);
    stopsStore.setIsStopSheetOpen(true);
  };

  const addPreviousJob = () => {
    stopsStore.setJobSheetMode("add-previous");
    stopsStore.setActiveLocationById(null);
    stopsStore.setIsStopSheetOpen(true);
  };

  // useEffect(() => {
  //   // Clean up active job when component unmounts
  //   return () => {
  //     void setActiveJobId(null);
  //     stopsStore.setIsStopSheetOpen(false);
  //     stopsStore.setIsFieldJobSheetOpen(false);
  //   };
  // }, []);

  const value = {
    activeJobId: stopsStore.activeLocation?.job.id ?? null,
    setActiveJobId,
    isJobActive,
    activeJobData: stopsStore.activeLocation,
    isLoading,
    openJobEdit,
    openViewJob,
    isJobSheetOpen: stopsStore.isStopSheetOpen,
    setIsJobSheetOpen: stopsStore.setIsStopSheetOpen,
    isFieldJobSheetOpen: stopsStore.isFieldJobSheetOpen,
    setIsFieldJobSheetOpen: stopsStore.setIsFieldJobSheetOpen,
    onFieldJobSheetOpen,
    jobSheetMode: stopsStore.jobSheetMode,
    setJobSheetMode: stopsStore.setJobSheetMode,
    createNewJob,
    addPreviousJob,
    onSheetOpenChange,
    findJobById,
    setActiveJob,
    routeJobs: getJobs.data ?? [],
  };
  return (
    <ClientContext.Provider value={value as ClientContextType}>
      {children}
    </ClientContext.Provider>
  );
};

export const useClient = (): ClientContextType => {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error("useClient must be used within a ClientProvider");
  }
  return context;
};
