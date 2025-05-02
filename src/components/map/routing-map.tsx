//routing-map.tsx
"use client";

import type L from "leaflet";
import type { LatLngExpression, Map as LeafletMap, PathOptions } from "leaflet";
import type { MouseEventHandler } from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
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
import { useClient } from "~/providers/client";
import { useDriver } from "~/providers/driver";

import type { Coordinates, GeoJsonData } from "~/types/geolocation";
import { getStyle } from "~/utils/generic/color-handling";
import { cuidToIndex } from "~/utils/generic/format-utils.wip";
import { formatGeometryString } from "~/lib/optimization/vroom-optimization";
import { pusherClient } from "~/lib/soketi/client";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useDepot } from "~/hooks/depot/use-depot";
import { useLasso } from "~/hooks/maps/use-lasso";
import { useMapGraphics } from "~/hooks/maps/use-map-points";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { useDefaultMutationActions } from "~/hooks/use-default-mutation-actions";
import useMap from "~/hooks/use-map";
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
import { VendingMachine } from "~/types/vendingMachine";




type Props = {
  className?: string;
  children?: React.ReactNode;
};

interface MapRef {
  reactLeafletMap: LeafletMap | null;
}

type CoordMap = Record<string, { lat: number; lng: number }>;

const RoutingMap = forwardRef<MapRef, Props>(({ className }, ref) => {
  const { routeId, depotId } = useSolidarityState();

  const { defaultActions } = useDefaultMutationActions({
    invalidateEntities: ["driver", "vehicle", "routePlan", "job", "customer"],
  });
  //xinyi
  const apiContext = api.useUtils();
  //xinyi
  const mapRef = useRef<LeafletMap>(null);
  

  const [latLng, setLatLng] = useState<L.LatLng | null>(null);
  const [activeDrivers, setActiveDrivers] = useState<CoordMap>({});
  //xinyi
  const [selectedVendingMachine, setSelectedVendingMachine] = useState<VendingMachine | null>(null);
  const [newName, setNewName] = useState<string>("");
  const { setSelectedJobIds, selectedJobIds } = useClient();
  const { currentDepot } = useDepot();
  const { activeDriverData } = useDriver();
  const { activeJobData } = useClient();

  //to be edited
  const [inventoryJson, setInventoryJson] = useState("");
    useEffect(() => {
      if (selectedVendingMachine) {
        setInventoryJson(JSON.stringify(selectedVendingMachine.inventory ?? {}, null, 2));
      }
    }, [selectedVendingMachine]);

  const [editedInventory, setEditedInventory] = useState<Record<string, number>>({});
    useEffect(() => {
      if (selectedVendingMachine) {
        setEditedInventory(selectedVendingMachine.inventory ?? {});
      }
    }, [selectedVendingMachine]);
  //to be edited
  

  const params = {
    mapRef: mapRef.current!,
    trackingEnabled: true,
    constantUserTracking: true,
    activeDriverData,
    activeJobData,
  };

  const { currentLocation } = useMap(params);
  const { findVehicleById } = useDriver();

  const createVehicleBundle =
    api.driver.createByLatLng.useMutation(defaultActions);
  const createJobBundle = api.job.createByLatLng.useMutation(defaultActions);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-call
  const createVendingMachine = api.vendingMachine.create.useMutation({
    onSuccess: async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await apiContext.vendingMachine.getAll.invalidate();
    },
    onError: (error) => {
      console.error(error);
    },
  });
  const getVendingMachines = api.vendingMachine.getAll.useQuery(undefined, {
    enabled: true,
  });
  
  const addDriverByLatLng = async ({ latitude, longitude }: Coordinates) => {
    await createVehicleBundle.mutateAsync({
      latitude,
      longitude,
      depotId,
      routeId,
    });
  };

  const addJobByLatLng = async ({ latitude, longitude }: Coordinates) => {
    await createJobBundle.mutateAsync({
      latitude,
      longitude,
      depotId,
      routeId,
    });
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const addVendingMachineByLatLng = async ({ latitude, longitude }: Coordinates) => {
    await createVendingMachine.mutateAsync({
      name: "New Vending Machine",
      coordinates: { latitude, longitude },
      address: undefined,
      inventory: {},
    });
  };
  
  useImperativeHandle(ref, () => ({
    reactLeafletMap: mapRef.current,
  }));

  const handleRightClick = (event: MouseEvent) => {
    if (!mapRef.current) return;
    setLatLng(mapRef.current.mouseEventToLatLng(event));
  };

  const mapGraphics = useMapGraphics({
    setSelectedJobIds,
    selectedJobIds,
  });

  useLasso({
    mapRef,
    setSelectedJobIds,
    selectedJobIds,
    assignedMapPointsLength: mapGraphics.assignedMapPoints.length,
  });

  const updateActiveDriverLocations = (obj: {
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

  let useThisCenter = MAP_DATA.center;
  if (currentDepot?.address?.latitude && currentDepot?.address?.longitude) {
    useThisCenter = [
      currentDepot.address.latitude,
      currentDepot.address.longitude,
    ];
  }

  useEffect(() => {
    pusherClient.subscribe("map");
    pusherClient.bind("evt::clear-route", mapGraphics.handleClearRoute);
    pusherClient.bind("evt::update-location", updateActiveDriverLocations);

    return () => {
      pusherClient.unsubscribe("map");
    };
  }, []);

  //tobe edited
  const updateVendingMachine = api.vendingMachine.update.useMutation({
      onSuccess: async () => {
        await apiContext.vendingMachine.getAll.invalidate();
      },
      onError: (error) => {
        console.error(error);
      },
  });
  //tobe edited

  return (
    <>
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

            
            {getVendingMachines.data?.map((vending) => (
              <RouteMarker
                key={vending.id}
                id={vending.id}
                variant="depot"
                position={[
                  vending.coordinates.latitude,
                  vending.coordinates.longitude,
                ]}
                color={5}
                onClick={() => {
                  setSelectedVendingMachine(vending);
                  setNewName(vending.name ?? "");
                  setEditedInventory(vending.inventory);
                }}
              >
                <div className="flex flex-col">
                  <span className="font-semibold">{vending.name ?? "Unnamed Vending"}</span>
                  {vending.address && (
                    <span className="text-xs">{vending.address}</span>
                  )}
                </div>
              </RouteMarker>
            ))}

            {activeDrivers &&
              Object.keys(activeDrivers).map(async (vehicleId) => {
                const latLng = activeDrivers[vehicleId];
                const driver = findVehicleById(vehicleId);

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
                  {!!mapGraphics.driverMapPoints &&
                    mapGraphics.driverMapPoints?.length > 0 &&
                    mapGraphics.driverMapPoints.map((vehicle, idx) => {
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
                  {mapGraphics.assignedMapPoints?.length > 0 &&
                    mapGraphics.assignedMapPoints.map((stop, idx) => (
                      <RouteMarker
                        key={idx}
                        variant="stop"
                        id={stop.id}
                        position={[stop.lat, stop.lng]}
                        color={
                          mapGraphics.getJobStatusColor({
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
                  {mapGraphics.routeGeoJsonList.length > 0 &&
                    mapGraphics.routeGeoJsonList.map((route) => (
                      <GeoJSON
                        key={route.id}
                        data={
                          formatGeometryString(
                            route.geoJson,
                            route.vehicleId,
                          ) as unknown as GeoJsonData
                        }
                        style={getStyle as PathOptions}
                      />
                    ))}
                </LeafletLayerGroup>
              </LayersControl.Overlay>
              <LayersControl.Overlay name="Unassigned Stops" checked>
                <LeafletLayerGroup>
                  {mapGraphics.unassignedMapPoints?.length > 0 &&
                    mapGraphics.unassignedMapPoints.map((stop, idx) => (
                      <RouteMarker
                        key={idx}
                        variant="stop"
                        color={mapGraphics.getJobStatusColor({
                          color: Number(stop.color) ?? -1,
                          id: Number(stop.id),
                        })}
                        id={stop.id}
                        position={[stop.lat, stop.lng]}
                        useThisIconInstead={mapGraphics.assignAnIcon2(
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
            <ContextMenuItem
              onClick={() =>
                addJobByLatLng({
                  latitude: latLng.lat,
                  longitude: latLng.lng,
                })
              }
            >
              <div className="flex flex-col items-center justify-center">
                <div>Add Client here</div>
                <div className="text-sm text-gray-500">
                  ({latLng?.lat.toFixed(2) ?? 0}, {latLng?.lng.toFixed(2) ?? 0})
                </div>
              </div>
            </ContextMenuItem>

            <ContextMenuItem
              onClick={() =>
                addDriverByLatLng({
                  latitude: latLng.lat,
                  longitude: latLng.lng,
                })
              }
            >
              <div className="flex flex-col items-center justify-center">
                <div>Add Driver here</div>
                <div className="text-sm text-gray-500">
                  ({latLng?.lat.toFixed(2) ?? 0}, {latLng?.lng.toFixed(2) ?? 0})
                </div>
              </div>
            </ContextMenuItem>

            <ContextMenuItem
              onClick={() =>
                addVendingMachineByLatLng({
                  latitude: latLng.lat,
                  longitude: latLng.lng,
                })
              }
            >
              <div className="flex flex-col items-center justify-center">
                <div>Add Vending Machine here</div>
                <div className="text-sm text-gray-500">
                  ({latLng?.lat.toFixed(2) ?? 0}, {latLng?.lng.toFixed(2) ?? 0})
                </div>
              </div>
            </ContextMenuItem>
          </ContextMenuContent>
        )}
      </ContextMenu>

      
      {selectedVendingMachine && (
        <Sheet
          open={!!selectedVendingMachine}
          onOpenChange={(open) => {
            if (!open) setSelectedVendingMachine(null);
          }}
        >
          <SheetContent side="right" className="bg-white">
            <SheetHeader>
              <SheetTitle>Edit Vending Machine</SheetTitle>
              <SheetDescription>
                <input
                  className="border border-gray-300 rounded-md p-2 mt-2 w-full"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter vending machine name"
                />
              </SheetDescription>
            </SheetHeader>

            <div className="py-4 space-y-4">
              {Object.entries(editedInventory).map(([name, quantity], index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    className="border rounded p-2 flex-1"
                    value={name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setEditedInventory((prev) => {
                        const updated = { ...prev };
                        const value = updated[name]?? 0;
                        delete updated[name];
                        updated[newName] = value;
                        return updated;
                      });
                    }}
                    placeholder="Product Name"
                  />
                  <input
                    type="number"
                    className="border rounded p-2 w-24"
                    value={quantity}
                    onChange={(e) => {
                      const newQty = parseInt(e.target.value) || 0;
                      setEditedInventory((prev) => ({ ...prev, [name]: newQty }));
                    }}
                    placeholder="Quantity"
                  />
                  <button
                    className="text-red-500 hover:text-red-700"
                    onClick={() => {
                      setEditedInventory((prev) => {
                        const updated = { ...prev };
                        delete updated[name];
                        return updated;
                      });
                    }}
                  >
                    x
                  </button>
                </div>
              ))}

              <button
                className="text-blue-600 hover:underline"
                onClick={() => {
                  let newKey = "New Product";
                  let count = 1;
                  while (editedInventory[newKey]) {
                    newKey = `New Product ${count++}`;
                  }
                  setEditedInventory((prev) => ({ ...prev, [newKey]: 0 }));
                }}
              >
                + Add Product
              </button>
            </div>

            <SheetFooter>
              <button
                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                onClick={async () => {
                  if (!selectedVendingMachine) return;

                  const cleanedInventory = Object.fromEntries(
                    Object.entries(editedInventory).filter(
                      ([name, qty]) => name.trim() !== "" && qty >= 0
                    )
                  );

                  await updateVendingMachine.mutateAsync({
                    id: selectedVendingMachine.id,
                    data: {
                      name: newName.trim() || "Unnamed Vending Machine",
                      inventory: cleanedInventory,
                    },
                  });

                  await apiContext.vendingMachine.getAll.invalidate();
                  setSelectedVendingMachine(null);
                }}
              >
                Save Changes
              </button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
});

RoutingMap.displayName = "RoutingMap";
export default RoutingMap;
