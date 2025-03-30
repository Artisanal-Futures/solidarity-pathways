import { divIcon } from "leaflet";

type StopIconProps = {
  color: string;
  id?: number;
  textOverlay?: string;
};

export const StopIcon = ({ color, id, textOverlay }: StopIconProps) => {
  const markerHtmlStyles = `
      background-color: ${color ?? "#6366f1"};
      width: 2rem;
      height: 2rem;
      display: block;
      left: -0.5rem;
      top: -0.5rem;
      position: relative;
      border-radius: 3rem 3rem 0;
      transform: rotate(45deg); 
      box-shadow: 0 0 #0000, 0 0 #0000, 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
      border: 3px solid #FFFFFF`;

  return divIcon({
    className: "my-custom-pin",
    iconAnchor: [0, 24],
    popupAnchor: [0, -36],
    html: `<span style="${markerHtmlStyles}"><span class="-rotate-45 text-white font-bold fixed  h-full w-full items-center flex justify-center ">${
      textOverlay ?? id ?? ""
    }</span></span>`,
  });
};
