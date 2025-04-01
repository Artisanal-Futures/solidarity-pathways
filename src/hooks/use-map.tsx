/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import type { LatLngExpression, Map } from "leaflet";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMapStore } from "~/stores/use-map-store";
import axios from "axios";
import L from "leaflet";

import type { ClientJobBundle } from "~/lib/validators/client-job";
import type { DriverVehicleBundle } from "~/lib/validators/driver-vehicle";
import type { Coordinates } from "~/types/geolocation";
import { getCurrentLocation } from "~/lib/helpers/get-current-location";
import { formatGeometryString } from "~/lib/optimization/vroom-optimization";
import { api } from "~/trpc/react";

import { useOptimizedRoutePlan } from "./optimized-data/use-optimized-route-plan";
import { useSolidarityState } from "./optimized-data/use-solidarity-state";

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

type TUseMapProps = {
  mapRef: Map;
  currentLocation?: Partial<GeolocationCoordinates>;
  trackingEnabled?: boolean;
  driverEnabled?: boolean;
  constantUserTracking?: boolean;
  activeDriverData?: DriverVehicleBundle | null;
  activeJobData?: ClientJobBundle | null;
};

const useMap = ({
  mapRef,
  activeDriverData,
  activeJobData,

  constantUserTracking = true, //false, // was false
}: TUseMapProps) => {
  const [initial, setInitial] = useState(true);

  //const [flyToDriver, setFlyToDriver] = useState(true);
  //const [constantTracking, setConstantTracking] = useState(true);
  const [isSimulatingGPS, setIsSimulatingGPS] = useState(false);

  const { pathId, routeId } = useSolidarityState();
  const getRouteJobs = api.job.getBundles.useQuery(routeId, {
    enabled: !!routeId,
  });

  const {
    flyToDriver,
    setFlyToDriver,
    constantTracking,
    setConstantTracking,
    locationMessage,
    setLocationMessage,
  } = useMapStore();

  // const { active: activeJob } = useClientJobBundles();

  const getRouteVehicles = api.vehicle.getBundles.useQuery(routeId, {
    enabled: !!routeId,
  });

  const optimizedRoutePlan = useOptimizedRoutePlan();

  const urlParams = new URLSearchParams(window.location.search);
  const driverId = urlParams.get("driverId");

  const vehicleId = driverId;
  const matchedGeoJson = optimizedRoutePlan.mapData.geometry.find(
    (geo) => geo.vehicleId === vehicleId,
  )?.geoJson;

  const currentCoordinateIndexRef = useRef(0);
  const matchedPlanLatLng = useRef<[number, number][]>([]);

  if (matchedGeoJson) {
    const geoJson = formatGeometryString(matchedGeoJson, vehicleId!);
    matchedPlanLatLng.current = geoJson.coordinates;
  } else {
    //if(driverId) console.error(`Error: No matching plan found for vehicleId: ${vehicleId}`);
  }
  const locationUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [currentLocation, setCurrentLocation] = useState<
    Partial<GeolocationCoordinates>
  >({
    latitude: 0,
    longitude: 0,
    accuracy: 0,
  });

  // const [locationMessage, setLocationMessage] = useState<
  //   { error: boolean, message: string }
  // >({
  //   error: true,
  //   message: '[initial run]' // we need some time to warm up i guess
  // });

  useEffect(() => {
    if (!driverId) {
      return;
    } // if this is a distributor we don't need to run this logic at all

    if (constantUserTracking) {
      if (locationUpdateIntervalRef.current) {
        clearInterval(locationUpdateIntervalRef.current);
      }
      locationUpdateIntervalRef.current = setInterval(() => {
        let useThisLatitude = 0;
        let useThisLongitude = 0;
        let useThisAccuracy = 0;

        if (isSimulatingGPS && matchedPlanLatLng.current.length > 0) {
          //currentCoordinateIndexRef = (currentCoordinateIndexRef + 1) %
          currentCoordinateIndexRef.current =
            (currentCoordinateIndexRef.current + 1) %
            matchedPlanLatLng.current.length;

          matchedPlanLatLng.current.length;
          useThisLatitude =
            matchedPlanLatLng.current[currentCoordinateIndexRef.current]?.[1] ??
            0;
          useThisLongitude =
            matchedPlanLatLng.current[currentCoordinateIndexRef.current]?.[0] ??
            0;
          useThisAccuracy = 1;

          locationMessage.error = false;
          locationMessage.message = "success";

          console.log(
            currentCoordinateIndexRef.current,
            useThisLatitude,
            "update from simlulation",
            matchedPlanLatLng.current.length,
          );
        } else {
          getCurrentLocation({
            success: setCurrentLocation,
            setLocationMessage,
          });
        }
        if (!isSimulatingGPS) {
          useThisLatitude = currentLocation.latitude ?? 0;
          useThisLongitude = currentLocation.longitude ?? 0;
          useThisAccuracy = currentLocation.accuracy ?? 0;
        } else {
          // update currentLocation so that other features can use it
          setCurrentLocation({
            latitude: useThisLatitude,
            longitude: useThisLongitude,
            accuracy: useThisAccuracy,
          });
          console.log(
            "I think i'm overwriting w original values?",
            useThisLatitude,
            useThisLongitude,
            currentLocation.latitude,
            currentLocation.longitude,
            currentCoordinateIndexRef.current,
            "< current index",
          );
        }

        if (flyToDriver && useThisLatitude && currentLocation?.latitude) {
          // locationMessage.error seems to be lagged

          const currentZoom = mapRef.getZoom();
          flyToCurrentLocation(currentZoom);

          // console.log(
          //   "currentZoom ", currentZoom,
          //   "currentLocatin ", currentLocation,
          //   "!locationMessage.error ", !locationMessage.error
          // )
        }

        if (
          pathId &&
          useThisLatitude &&
          !locationMessage.error &&
          constantTracking
        ) {
          console.log("\t...calling update-user-location");
          void axios.post("/api/routing/update-user-location", {
            latitude: useThisLatitude,
            longitude: useThisLongitude,
            pathId: pathId,
          });
        }
      }, 2500); // Adjust based on your needs
    }

    return () => {
      if (locationUpdateIntervalRef.current) {
        clearInterval(locationUpdateIntervalRef.current);
      }
    };
  }, [
    constantUserTracking,
    pathId,
    isSimulatingGPS,
    matchedPlanLatLng,
    currentLocation,
    locationMessage,
  ]);

  const simulateMovementAlongRoute = () => {
    setIsSimulatingGPS(true); // Set isSimulatingGPS to true when simulation starts
  };

  const stopSimulation = useCallback(() => {
    setIsSimulatingGPS(false); // Set isSimulatingGPS to false when simulation stops
  }, []);

  const flyTo = useCallback(
    (coordinates: Coordinates, zoom: number) => {
      mapRef.flyTo([coordinates.latitude, coordinates.longitude], zoom);
    },
    [mapRef],
  );

  const flyToCurrentLocation = (zoom = 8) => {
    if (currentLocation)
      flyTo(
        {
          latitude: currentLocation.latitude!,
          longitude: currentLocation.longitude!,
        },
        zoom,
      );
  };
  const toggleConstantTracking = () => {
    if (pathId && currentLocation.latitude && currentLocation.longitude) {
      setConstantTracking(!constantTracking);
    }
  };

  const expandViewToFit = useCallback(() => {
    if (
      ((getRouteJobs?.data && getRouteJobs?.data.length > 0) ||
        (!!getRouteVehicles.data && getRouteVehicles.data.length > 0)) &&
      mapRef
    ) {
      const driverBounds = pathId
        ? optimizedRoutePlan.mapCoordinates.driver
        : getRouteVehicles.data?.map(
            (driver) =>
              [
                driver.vehicle.startAddress.latitude,
                driver.vehicle.startAddress.longitude,
              ] as LatLngExpression,
          );
      const locationBounds = pathId
        ? optimizedRoutePlan.mapCoordinates.jobs
        : getRouteJobs?.data?.map(
            (location) =>
              [
                location.job.address.latitude,
                location.job.address.longitude,
              ] as LatLngExpression,
          );

      // Create arrays from the bounds, ensuring they're not undefined
      const driverBoundsArray = driverBounds ? [...driverBounds] : [];
      const locationBoundsArray = locationBounds ? [...locationBounds] : [];

      // Combine the arrays and create a bounds object
      const allBounds = [...driverBoundsArray, ...locationBoundsArray];
      const bounds = allBounds.length > 0 ? L.latLngBounds(allBounds) : null;

      // Only fit bounds if we have valid bounds
      if (bounds) {
        mapRef.fitBounds(bounds);
      }

      // const bounds = L.latLngBounds([...driverBounds, ...locationBounds]);

      // mapRef.fitBounds(bounds);
    }
  }, [
    mapRef,
    getRouteVehicles?.data,
    getRouteJobs?.data,
    optimizedRoutePlan,
    pathId,
  ]);

  useEffect(() => {
    if (activeDriverData && mapRef)
      flyTo(activeDriverData.vehicle.startAddress, 15);
  }, [activeDriverData, mapRef, flyTo]);

  useEffect(() => {
    if (activeJobData && mapRef) flyTo(activeJobData.job.address, 15);
  }, [activeJobData, mapRef, flyTo]);

  useEffect(() => {
    if (initial && mapRef && getRouteVehicles?.data && getRouteJobs?.data) {
      expandViewToFit();
      setInitial(false);
    }
  }, [
    expandViewToFit,
    mapRef,
    getRouteVehicles?.data,
    getRouteJobs?.data,
    initial,
  ]);

  const [hasPriorSuccess, setHasPriorSuccess] = useState(false);

  useEffect(() => {
    if (locationMessage.message === "success" && !locationMessage.error) {
      setHasPriorSuccess(true);
    }
  }, [locationMessage]);

  // Exporting a message for @map-view-button to display the Location Services state
  const exportLocationServiceMessage = () => {
    if (!constantTracking) {
      return "Start Location Services";
    }
    if (locationMessage.message.includes("initial")) {
      return "Starting Location Services";
    } else if (locationMessage.message.includes("timed out")) {
      return "Getting Location";
    } else if (locationMessage.message.includes("success")) {
      if (!locationMessage.error && !hasPriorSuccess) {
        setHasPriorSuccess(true);
        return "Found Location";
      } else if (!locationMessage.error && hasPriorSuccess) {
        return "Stop Location Services";
      }
    } else {
      return "Locating GPS...";
    }
  };

  return {
    expandViewToFit,
    flyToDriver,
    setFlyToDriver,
    currentLocation,
    flyToCurrentLocation,
    toggleConstantTracking,
    constantTracking,
    simulateMovementAlongRoute,
    stopSimulation,
    exportLocationServiceMessage,
  };
};

export default useMap;
