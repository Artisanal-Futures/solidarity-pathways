import type { DivIcon } from "leaflet";
import type { MarkerProps } from "react-leaflet";
import { useMemo } from "react";
import { Building, Truck } from "lucide-react";
import { Marker, Popup } from "react-leaflet";

import type { Driver } from "~/types/driver";
import type { RouteData } from "~/types/route";
import type { Stop } from "~/types/stop";
import { getColor } from "~/utils/generic/color-handling";

import { MapIcon } from "./map-icon";
import { PositionIcon } from "./position-icon";
import { StopIcon } from "./stop-icon";

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
          return MapIcon({ color: calculatedColor.text!, Icon: Building });
        default:
          return MapIcon({ color: calculatedColor.text!, Icon: Truck });
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
