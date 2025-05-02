/* eslint-disable react-hooks/exhaustive-deps */
import type { Map as LeafletMap } from "leaflet";
import { useEffect } from "react";
import L from "leaflet";

interface LassoHandlerFinishedEventData {
  originalEvent: MouseEvent;
  latLngs: L.LatLng[];
  layers: L.Layer[];
}

type LassoHandlerFinishedEvent = L.LeafletEvent & LassoHandlerFinishedEventData;

type Props = {
  mapRef: React.RefObject<LeafletMap>;
  setSelectedJobIds: (selected: string[]) => void;
  selectedJobIds: string[];
  assignedMapPointsLength: number;
};

// WARNING
//
// There's some kind of interaction between lasso, Job Ids and Layers
// Where if the markers involved are assigned a new layer the ids "become different"
// and the selection breaks where it'll select other stops on additive select
// This can happen if the market moves to the assigned layer
//
// I haven't tracked down why this happens but I may be conflating id names
// and, for example, stop.ids may be differnt from job.ids in a non-stable manner
//
//
// LASSO Effects
// const LIGHTBLUE = "#0000003a";

export const useLasso = ({
  mapRef,
  setSelectedJobIds,
  selectedJobIds,
  assignedMapPointsLength,
}: Props) => {
  const isDriverFromURL = window.location.href.includes("driverId");

  useEffect(() => {
    const map = mapRef.current;
    if (map && !isDriverFromURL) {
      void import("leaflet-lasso").then(() => {
        if (!map) return;

        if (!document.querySelector(".leaflet-control-lasso")) {
          L.control.lasso().addTo(map);
          console.log("added lasso once!");
        } else {
          console.log("prevented lass from being added twice");
        }

        // Listen for lasso.finished event to get selected layers
        map.on("lasso.finished", (event) => {
          const lassoEvent = event as LassoHandlerFinishedEvent;

          if (lassoEvent.layers.length === 0) {
            setSelectedJobIds([]);
            console.log("wiped all dis");
            return;
          }

          const tempSelectedJobIds: string[] = [];
          lassoEvent.layers.forEach((layer) => {
            const { id } = (
              layer.options as {
                children: { props: { children: { props: { id: string } } } };
              }
            ).children.props.children.props;
            tempSelectedJobIds.push(id);
          });

          console.log("\t have selected things");

          // Set intersection logic
          const updatedSelectedJobIds = selectedJobIds.reduce((acc, id) => {
            // If id is in tempSelectedJobIds, remove it (toggle off), otherwise keep it
            if (!tempSelectedJobIds.includes(id)) {
              acc.push(id);
            }
            return acc;
          }, [] as string[]);
          console.log("\t filtered out existing ids");

          // Add new ids that were not already selected
          tempSelectedJobIds.forEach((id) => {
            if (!selectedJobIds.includes(id)) {
              updatedSelectedJobIds.push(id);
            }
          });
          console.log("\t about to set with new ids");

          setSelectedJobIds(updatedSelectedJobIds);
        });
      });
    }
    // Cleanup
    return () => {
      if (map) {
        map.off("lasso.finished");
      }
    };
  }, [mapRef.current, selectedJobIds, assignedMapPointsLength]);
};
