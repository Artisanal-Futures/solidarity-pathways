/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";

interface MapState {
  flyToDriver: boolean;
  constantTracking: boolean;
  isSimulatingGPS: boolean;
  setFlyToDriver: (value: boolean) => void;
  setConstantTracking: (value: boolean) => void;
  setIsSimulatingGPS: (value: boolean) => void;
  locationMessage: Record<string, unknown>;
  setLocationMessage: (value: Record<string, unknown>) => void;
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
