/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

import type { ClientJobBundle } from "~/lib/validators/client-job";
import { checkIfJobExistsInRoute } from "~/lib/helpers/get-specifics";
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
  selectedJobIds: string[];
  setSelectedJobIds: (ids: string[]) => void;
};

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const ClientProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { updateUrlParams } = useUrlParams();
  const { routeId } = useSolidarityState();
  const [isLoading, setIsLoading] = useState(false);
  const [activeJobId, setActiveJobIdState] = useState<string | null>(null);
  const [activeJobData, setActiveJobData] = useState<ClientJobBundle | null>(
    null,
  );
  const [isJobSheetOpen, setIsJobSheetOpen] = useState(false);
  const [isFieldJobSheetOpen, setIsFieldJobSheetOpen] = useState(false);
  const [jobSheetMode, setJobSheetMode] = useState("create-new");
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);

  const getJobs = api.job.getBundles.useQuery(routeId, {
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
    setActiveJobData(job);
  };

  const setActiveJobId = async (id: string | null) => {
    setIsLoading(true);
    updateUrlParams({ key: "jobId", value: id });
    setActiveJobIdState(id);

    if (id) {
      const job = checkIfJobExistsInRoute({
        id,
        routeJobs: getJobs.data ?? [],
      });

      if (job) {
        setActiveJob(job);
        setIsJobSheetOpen(true);
      } else {
        setIsJobSheetOpen(false);
        setActiveJobData(null);
      }
    } else {
      setIsJobSheetOpen(false);
      setActiveJobData(null);
    }

    setIsLoading(false);
  };

  const isJobActive = (id: string) => {
    return activeJobId === id;
  };

  const openJobEdit = (id: string) => {
    void setActiveJobId(id);
    setIsJobSheetOpen(true);
  };

  const openViewJob = (id: string | null) => {
    if (id) {
      void setActiveJobId(id);
    }
    setIsFieldJobSheetOpen(true);
  };

  const onSheetOpenChange = (open: boolean) => {
    if (!open) void setActiveJobId(null);
    setIsJobSheetOpen(open);
  };

  const onFieldJobSheetOpen = (open: boolean) => {
    if (!open) void setActiveJobId(null);
    setIsFieldJobSheetOpen(open);
  };

  const createNewJob = () => {
    setJobSheetMode("create-new");
    setActiveJobIdState(null);
    setActiveJobData(null);
    setIsJobSheetOpen(true);
  };

  const addPreviousJob = () => {
    setJobSheetMode("add-previous");
    setActiveJobIdState(null);
    setActiveJobData(null);
    setIsJobSheetOpen(true);
  };

  useEffect(() => {
    // Clean up active job when component unmounts
    return () => {
      void setActiveJobId(null);
      setIsJobSheetOpen(false);
      setIsFieldJobSheetOpen(false);
      setActiveJobData(null);
    };
  }, []);

  const value = {
    activeJobId,
    setActiveJobId,
    isJobActive,
    activeJobData,
    isLoading,
    openJobEdit,
    openViewJob,
    isJobSheetOpen,
    setIsJobSheetOpen,
    isFieldJobSheetOpen,
    setIsFieldJobSheetOpen,
    onFieldJobSheetOpen,
    jobSheetMode,
    setJobSheetMode,
    createNewJob,
    addPreviousJob,
    onSheetOpenChange,
    findJobById,
    setActiveJob,
    routeJobs: getJobs.data ?? [],
    selectedJobIds,
    setSelectedJobIds,
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
