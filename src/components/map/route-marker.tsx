import type { DivIcon } from "leaflet";
import type { MarkerProps } from "react-leaflet";
import { useMemo } from "react";
import { getColor } from "~/utils/generic/color-handling";
import { Marker, Popup } from "react-leaflet";

import type { Driver, RouteData, Stop } from "~/types";

import { DepotIcon } from "./depot-icon";
import { PositionIcon } from "./position-icon";
import { StopIcon } from "./stop-icon";
import { TruckIcon } from "./truck-icon";

type Props = MarkerProps & {
  variant: "stop" | "car" | "depot" | "currentPosition";
  color: number;
  children: React.ReactNode;
  id: string;
  stopId?: number;
  data?: Stop | Driver | RouteData;
  onClick?: () => void;
  useThisIconInstead?: DivIcon;
};

export const RouteMarker = ({
  position,
  color,
  variant,
  stopId,
  children,
  onClick,
  useThisIconInstead,
}: Props) => {
  const calculatedColor = useMemo(() => {
    if (color == -1)
      return {
        fill: "#0000003a",
        text: "#00000001",
      };

    return getColor(color);
  }, [color]);

  // Determine the icon based on the variant if useThisIcon is not provided
  const icon = useMemo(() => {
    if (useThisIconInstead) {
      return useThisIconInstead;
    } else {
      switch (variant) {
        case "stop":
          return StopIcon({ color: calculatedColor.fill!, id: stopId! });
        case "currentPosition":
          return PositionIcon();
        case "depot":
          return DepotIcon(calculatedColor.text!);
        default:
          return TruckIcon(calculatedColor.text!);
      }
    }
  }, [variant, calculatedColor, stopId, useThisIconInstead]);

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{
        click: () => {
          if (onClick) onClick();
        },
      }}
    >
      <Popup>{children}</Popup>
    </Marker>
  );
};
