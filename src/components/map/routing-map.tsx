import type { LatLngExpression, Map as LeafletMap } from "leaflet";
import type { MouseEventHandler } from "react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import L from "leaflet";
import {
  Circle,
  GeoJSON,
  LayersControl,
  LayerGroup as LeafletLayerGroup,
  MapContainer,
  TileLayer,
} from "react-leaflet";

import "~/styles/geosearch.css";
import "~/styles/leaflet.css";

import { MAP_DATA } from "~/data/map-data";
import { formatGeometryString } from "~/services/optimization/aws-vroom/utils";
import { getStyle } from "~/utils/generic/color-handling";
import { cuidToIndex } from "~/utils/generic/format-utils.wip";

import type { GeoJsonData } from "~/types";
import type { MapPoint } from "~/types/map";
import { pusherClient } from "~/lib/soketi/client";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useDepot } from "~/hooks/depot/use-depot";
import { useDriverVehicleBundles } from "~/hooks/drivers/use-driver-vehicle-bundles";
import { useClientJobBundles } from "~/hooks/jobs/use-client-job-bundles";
import { useStopsStore } from "~/hooks/jobs/use-stops-store";
import { useOptimizedRoutePlan } from "~/hooks/optimized-data/use-optimized-route-plan";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { useRoutePlans } from "~/hooks/plans/use-route-plans";
import useMap from "~/hooks/use-map";
import { useMediaQuery } from "~/hooks/use-media-query";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "~/components/ui/context-menu";
// Add lasso selections to the route store
import { MapPopup } from "~/components/map/map-popup";
import { RouteMarker } from "~/components/map/route-marker";

import { MapViewButton } from "./map-view-button";
import { StopIcon } from "./stop-icon";

type Props = {
  className?: string;
  children?: React.ReactNode;
};

interface MapRef {
  reactLeafletMap: LeafletMap | null;
}

type CoordMap = Record<string, { lat: number; lng: number }>;

const isDriverFromURL = window.location.href.includes("driverId");

const RoutingMap = forwardRef<MapRef, Props>(({ className }, ref) => {
  const { pathId, routeId } = useSolidarityState();

  const mapRef = useRef<LeafletMap>(null);

  const [enableTracking, setEnableTracking] = useState(false);

  const { setSelectedJobIds, selectedJobIds } = useStopsStore.getState();

  const params = {
    mapRef: mapRef.current!,
    trackingEnabled: true,
    constantUserTracking: enableTracking,
  };

  const { currentLocation } = useMap(params);
  const [latLng, setLatLng] = useState<L.LatLng | null>(null);

  const [activeDrivers, setActiveDrivers] = useState<CoordMap>({});

  const { createNewDriverByLatLng } = useDriverVehicleBundles();

  const getVehicleById = api.routePlan.getVehicleByIdControlled.useMutation();

  const jobBundles = useClientJobBundles();
  const routePlans = useRoutePlans();

  const getRouteVehicles = api.routePlan.getVehicleBundles.useQuery(
    { routeId },
    { enabled: !!routeId },
  );

  // const drivers = bundles?.all;
  const addDriverByLatLng = createNewDriverByLatLng;
  const addJobByLatLng = jobBundles.createByLatLng;

  const optimizedRoutePlan = useOptimizedRoutePlan();

  useImperativeHandle(ref, () => ({
    reactLeafletMap: mapRef.current,
  }));

  const handleRightClick = (event: MouseEvent) => {
    if (!mapRef.current) return;
    setLatLng(mapRef.current.mouseEventToLatLng(event));
  };

  const stopMapPoints: MapPoint[] = useMemo(() => {
    return pathId
      ? optimizedRoutePlan.mapData.jobs
      : jobBundles.data.map((stop) => ({
          id: stop.job.id,
          type: "job",
          lat: stop.job.address.latitude,
          lng: stop.job.address.longitude,
          address: stop.job.address.formatted,
          name: stop?.client?.name ?? "New Stop",
          color: !stop.job.isOptimized
            ? "-1"
            : `${cuidToIndex(routePlans.findVehicleIdByJobId(stop.job.id))}`,
        }));
  }, [jobBundles.data, optimizedRoutePlan.mapData.jobs, pathId, routePlans]);

  const driverMapPoints: MapPoint[] = pathId
    ? optimizedRoutePlan.mapData.driver
    : getRouteVehicles?.data?.map((driver) => ({
        id: driver.vehicle.id,
        type: "vehicle",
        lat: driver.vehicle.startAddress?.latitude,
        lng: driver.vehicle.startAddress?.longitude,
        address: driver.vehicle.startAddress?.formatted ?? "",
        name: driver?.driver?.name ?? "Driver",
        color:
          routePlans.optimized.length > 0
            ? `${cuidToIndex(driver.vehicle.id)}`
            : "3",
      }));

  let unassignedMapPoints: MapPoint[] = stopMapPoints.filter(
    (stop) => stop.color === "-1" || !selectedJobIds.includes(stop.id),
  );

  let assignedMapPoints: MapPoint[] = stopMapPoints.filter(
    (stop) => stop.color !== "-1" && selectedJobIds.includes(stop.id),
  );

  const routeGeoJsonList = pathId
    ? optimizedRoutePlan.mapData.geometry
    : routePlans.optimized.map((route) => {
        return {
          id: route.id,
          geoJson: route.geoJson,
          vehicleId: route.vehicleId,
        };
      });

  const handleClearRoute = () => {
    stopMapPoints.forEach((stop) => {
      if (selectedJobIds.includes(stop.id)) {
        stop.color = "-1";
        console.log("changed  color!");
      }
    });

    setSelectedJobIds([]);

    assignedMapPoints = [];
    // setRouteGeoJsonList([]);
    assignedMapPoints = [];
    unassignedMapPoints = [...stopMapPoints];

    //routeGeoJsonList = []
  };

  useEffect(() => {
    pusherClient.subscribe("map");
    pusherClient.bind("evt::clear-route", handleClearRoute);
    pusherClient.bind("evt::update-location", setActiveDriverIcons);

    return () => {
      pusherClient.unsubscribe("map");
    };
  }, []);

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
  const LIGHTBLUE = "#0000003a";

  useEffect(() => {
    if (mapRef.current && !isDriverFromURL) {
      void import("leaflet-lasso").then(() => {
        if (!mapRef.current) return;

        if (!document.querySelector(".leaflet-control-lasso")) {
          L.control.lasso().addTo(mapRef.current);
          console.log("added lasso once!");
        } else {
          console.log("prevented lass from being added twice");
        }

        // Listen for lasso.finished event to get selected layers
        mapRef.current.on("lasso.finished", (event) => {
          if (event.layers.length === 0) {
            setSelectedJobIds([]);
            console.log("wiped all dis");
            return;
          }

          const tempSelectedJobIds: string[] = [];

          event.layers.forEach((layer) => {
            const { id } = layer.options?.children.props.children.props;
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
          }, []);
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
      if (mapRef.current) {
        mapRef.current.off("lasso.finished");
      }
    };
  }, [mapRef.current, selectedJobIds, assignedMapPoints.length]);

  const setActiveDriverIcons = (obj: {
    vehicleId: string;
    latitude: number;
    longitude: number;
  }) => {
    setActiveDrivers((prevCoordMap) => ({
      ...prevCoordMap,
      [obj.vehicleId]: {
        lat: obj.latitude,
        lng: obj.longitude,
      },
    }));
  };

  // Implments state tabel based coloring
  //
  // Mode    Lassoed Optimized   Color Result
  // ----------------------------------
  // Plan    No      No          Gray, transparent
  // Plan    No      Yes         Bright Yellow # error, not possible
  // Plan    Yes     No          Lime Green # part of the routing plan
  // Plan    Yes     Yes         Lime Green # part of the routing plan
  // Calc    No      No          Gray, transparent
  // Calc    No      Yes         Bright Yellow # error, not possible
  // Calc    Yes     No          Gray, transparent
  // Calc    Yes     Yes         cuidToIndex # use driver color

  const urlParams = new URLSearchParams(window.location.search); // useSearchparams or router seems to block leaflet from loading ???

  const getJobStatusColor = (stop: { color: number; id: number }) => {
    let color = stop.color;
    const jobStatus = routePlans.optimized
      .flatMap((route) =>
        route.stops.filter((aStop) => Number(aStop.jobId) === stop.id),
      )
      .map((stop) => stop.status)[0];

    // Determine the color based on the job's status
    if (jobStatus === "COMPLETED") {
      color = -20; //"#00FF00";
    } else if (jobStatus === "FAILED") {
      color = -10; //"#FF0000";
    }
    console.log("status is", jobStatus, stop.id, color);

    //return color;
    return color; //stop.color
  };

  const assignAnIcon2 = (
    lassoed: boolean,
    optimized: boolean,
    associatedStop: MapPoint,
  ) => {
    let color = "#0000003a"; // Gray, transparent
    let text_overlay = "!!!"; // a subtle marker that something is wrong color wise

    const mode = urlParams.get("mode") ?? undefined;
    if (mode === "plan") {
      if (!lassoed && !optimized) {
        color = "#0000003a"; // Gray, transparent
        text_overlay = ".";
      } else if (lassoed && !optimized) {
        color = "#90F4005a"; // Change to yellow, transparent
        text_overlay = "+";
      } else if (!lassoed && optimized) {
        color = "#FFFF00"; // Bright Yellow, not possible
        text_overlay = "LABEL ERROR";
      } else if (lassoed && optimized) {
        color = "#90F4005a"; // return "Lime green, transparent";
        text_overlay = "+"; // ... this also shouldn't be possible but ... whatevs
      }
    }
    if (mode === "calculate") {
      if (!lassoed && !optimized) {
        color = "#0000003a"; // Remains Gray, transparent
        text_overlay = ".";
      } else if (lassoed && !optimized) {
        color = "#F3CA403a"; //"#6699CC8a" // Warning, this stop not routed
        text_overlay = "-";
      } else if (!lassoed && optimized) {
        color = "#FFFF00"; // Bright Yellow, not possible
        text_overlay = "LABEL ERROR";
      } else if (lassoed && optimized) {
        // Note I just let the assigned layer use it's color=...
        // this is untested
        color = associatedStop.color;
        text_overlay = "$";
      }
    }
    // Then we're in the driver screen
    if (!mode) {
      text_overlay = "";
    }

    return StopIcon({ color, textOverlay: text_overlay });
  };

  const { currentDepot } = useDepot();
  let useThisCenter = MAP_DATA.center;
  if (currentDepot?.address?.latitude && currentDepot?.address?.longitude) {
    useThisCenter = [
      currentDepot.address.latitude,
      currentDepot.address.longitude,
    ];
  }

  const [snap, setSnap] = useState<number | string | null>(0.1);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  return (
    <>
      {/* {mapRef.current && pathId && !isDesktop && (
          <>
            <DynamicMapViewButtons mapRef={mapRef.current} snap={snap} />
            <MobileDrawer snap={snap} setSnap={setSnap} />
          </>
        )} */}

      <ContextMenu>
        <ContextMenuTrigger
          className={cn(className, "z-0 flex w-full flex-col max-lg:grow")}
          onContextMenu={
            handleRightClick as unknown as MouseEventHandler<HTMLDivElement>
          }
        >
          {" "}
          <MapContainer
            ref={mapRef}
            center={useThisCenter} //{MAP_DATA.center} // {useThisCenter}//
            zoom={MAP_DATA.zoom}
            doubleClickZoom={MAP_DATA.doubleClickZoom}
            maxBounds={MAP_DATA.maxBounds}
            minZoom={MAP_DATA.minZoom}
            style={MAP_DATA.style}
            className={"relative"}
          >
            {/*
                see:

                # Toner paper
                https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}.png

                # Water color
                https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg

                # Humantarian
                https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png

                default: https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
              */}
            {/* 
              <TileLayer
                url="http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
                attribution='Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
              /> */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {mapRef.current && <MapViewButton mapRef={mapRef.current} />}

            {currentLocation && (
              <RouteMarker
                id={"0"}
                variant="currentPosition"
                position={[
                  currentLocation.latitude!,
                  currentLocation.longitude!,
                ]}
                color={3}
              >
                Current Location
                <Circle
                  center={
                    [
                      currentLocation.latitude!,
                      currentLocation.longitude!,
                    ] as LatLngExpression
                  }
                  radius={currentLocation?.accuracy ?? 0}
                  color="blue"
                />
              </RouteMarker>
            )}

            {activeDrivers &&
              Object.keys(activeDrivers).map(async (vehicleId) => {
                const latLng = activeDrivers[vehicleId];
                const driver = await getVehicleById.mutateAsync({
                  routeId,
                  vehicleId,
                });

                return (
                  <RouteMarker
                    id={"0"}
                    key={vehicleId}
                    variant="car"
                    position={[latLng!.lat, latLng!.lng]}
                    color={cuidToIndex(vehicleId)}
                  >
                    <MapPopup
                      name={driver?.driver.name ?? "Driver"}
                      address={driver?.driver?.address?.formatted ?? ""}
                      id={vehicleId}
                      kind="DRIVER"
                    />
                  </RouteMarker>
                );
              })}
            <LayersControl position="topright">
              <LayersControl.Overlay name="Drivers" checked>
                <LeafletLayerGroup>
                  {driverMapPoints?.length > 0 &&
                    driverMapPoints.map((vehicle, idx) => {
                      const latLng: [number, number] = [
                        vehicle.lat,
                        vehicle.lng,
                      ];

                      const isActive = activeDrivers[vehicle.id];

                      return (
                        <RouteMarker
                          key={idx}
                          variant={isActive ? "depot" : "car"}
                          id={vehicle.id}
                          position={latLng}
                          color={Number(vehicle.color)}
                        >
                          <MapPopup
                            name={vehicle.name}
                            address={vehicle.address}
                            id={vehicle.id}
                            kind="DRIVER"
                          />
                        </RouteMarker>
                      );
                    })}{" "}
                </LeafletLayerGroup>
              </LayersControl.Overlay>
              <LayersControl.Overlay name="Assigned Stops" checked>
                <LeafletLayerGroup>
                  {assignedMapPoints?.length > 0 &&
                    assignedMapPoints.map((stop, idx) => (
                      <RouteMarker
                        key={idx}
                        variant="stop"
                        id={stop.id}
                        position={[stop.lat, stop.lng]}
                        color={
                          getJobStatusColor({
                            color: Number(stop.color) ?? -1,
                            id: Number(stop.id),
                          }) ?? -1 // stop.color//
                        }
                      >
                        <MapPopup
                          name={stop.name}
                          address={stop.address}
                          id={stop.id}
                          kind="CLIENT"
                        />
                      </RouteMarker>
                    ))}{" "}
                  {routeGeoJsonList.length > 0 &&
                    routeGeoJsonList.map((route) => (
                      <GeoJSON
                        key={route.id}
                        data={
                          formatGeometryString(
                            route.geoJson,
                            route.vehicleId,
                          ) as unknown as GeoJsonData
                        }
                        style={getStyle}
                      />
                    ))}
                </LeafletLayerGroup>
              </LayersControl.Overlay>
              <LayersControl.Overlay name="Unassigned Stops" checked>
                <LeafletLayerGroup>
                  {unassignedMapPoints?.length > 0 &&
                    unassignedMapPoints.map((stop, idx) => (
                      <RouteMarker
                        key={idx}
                        variant="stop"
                        id={stop.id}
                        position={[stop.lat, stop.lng]}
                        useThisIconInstead={assignAnIcon2(
                          selectedJobIds.includes(stop.id), // lassoed
                          false, // optimized
                          stop, // stopReference
                        )}
                      >
                        <MapPopup
                          name={stop.name}
                          address={stop.address}
                          id={stop.id}
                          kind="CLIENT"
                        />
                      </RouteMarker>
                    ))}{" "}
                </LeafletLayerGroup>
              </LayersControl.Overlay>
            </LayersControl>
          </MapContainer>
        </ContextMenuTrigger>

        {latLng && (
          <ContextMenuContent className="z-50 flex justify-center">
            <ContextMenuItem onClick={() => addJobByLatLng({ ...latLng })}>
              <div className="flex flex-col items-center justify-center">
                <div>Add Client here</div>
                <div className="text-sm text-gray-500">
                  ({latLng?.lat.toFixed(2) ?? 0}, {latLng?.lng.toFixed(2) ?? 0})
                </div>
              </div>
            </ContextMenuItem>

            <ContextMenuItem onClick={() => addDriverByLatLng({ ...latLng })}>
              <div className="flex flex-col items-center justify-center">
                <div>Add Driver here</div>
                <div className="text-sm text-gray-500">
                  ({latLng?.lat.toFixed(2) ?? 0}, {latLng?.lng.toFixed(2) ?? 0})
                </div>
              </div>
            </ContextMenuItem>
          </ContextMenuContent>
        )}
      </ContextMenu>
    </>
  );
});
RoutingMap.displayName = "RoutingMap";
export default RoutingMap;
