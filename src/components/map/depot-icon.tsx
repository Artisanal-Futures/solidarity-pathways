import { divIcon } from "leaflet";
import { Building } from "lucide-react";
import ReactDOMServer from "react-dom/server";

export const DepotIcon = (color: string) => {
  return divIcon({
    className: "my-custom-pin",
    iconAnchor: [0, 24],
    popupAnchor: [0, -36],
    html: ReactDOMServer.renderToString(
      <span
        className={`relative -left-[0.5rem] -top-[0.5rem] block h-[2.5rem] w-[2.5rem] ${color} rounded-lg bg-white p-1 shadow-lg`}
      >
        <Building className={`h-full w-full`} />
      </span>,
    ),
  });
};
