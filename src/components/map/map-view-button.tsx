/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Map as LeafletMap } from "leaflet";
import { useEffect, useState } from "react";

import "~/styles/geosearch.css";
import "~/styles/leaflet.css";

import { cn } from "~/lib/utils";
import useMap from "~/hooks/use-map";
import { Button } from "~/components/ui/button";

export type MapPoint = {
  id: string;
  partnerId?: string;
  isAssigned?: boolean;
  type: "vehicle" | "job";
  lat: number;
  lng: number;
  name: string;
  address: string;
  color: string;
};

export const MapViewButton = ({ mapRef }: { mapRef: LeafletMap }) => {
  const [enableTracking] = useState(true); // was false; browser will ask

  const [isSimulating, setIsSimulating] = useState(false);

  const params = {
    mapRef,
    trackingEnabled: true,
    constantUserTracking: enableTracking,
  };

  const {
    simulateMovementAlongRoute,
    stopSimulation,
    exportLocationServiceMessage,
  } = useMap(params);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const message = exportLocationServiceMessage();
      console.log(message);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [exportLocationServiceMessage]);

  return (
    <div>
      <Button
        className={cn(
          "absolute bottom-10 z-[1000]",
          isSimulating && "bg-red-500",
        )}
        onClick={() => {
          if (isSimulating) {
            setIsSimulating(false);
            stopSimulation();
          } else {
            setIsSimulating(true);
            simulateMovementAlongRoute();
          }
        }}
      >
        {isSimulating ? "Stop Demo" : "Start Demo"}
      </Button>
    </div>
  );
};
