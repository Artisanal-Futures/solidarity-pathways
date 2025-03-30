/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";

type LocationMessage = {
  error: boolean;
  message: string;
};

interface MapState {
  flyToDriver: boolean;
  constantTracking: boolean;
  isSimulatingGPS: boolean;
  setFlyToDriver: (value: boolean) => void;
  setConstantTracking: (value: boolean) => void;
  setIsSimulatingGPS: (value: boolean) => void;
  locationMessage: LocationMessage;
  setLocationMessage: (value: LocationMessage) => void;
}

export const useMapStore = create<MapState>()((set) => ({
  flyToDriver: true,
  constantTracking: true,
  isSimulatingGPS: false,
  locationMessage: { error: true, message: "[initial run]" },
  setFlyToDriver: (value) => set({ flyToDriver: value }),
  setConstantTracking: (value) => set({ constantTracking: value }),
  setIsSimulatingGPS: (value) => set({ isSimulatingGPS: value }),
  setLocationMessage: (value) => set({ locationMessage: value }),
}));
