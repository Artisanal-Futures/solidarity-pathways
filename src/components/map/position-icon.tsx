import { divIcon } from "leaflet";

export const PositionIcon = () => {
  const markerHtmlStyles = `
    background-color: ${"#0043ff"};
    width: 1.25rem;
    height: 1.25rem;
    display: block;
   border-radius: 100%;
    position: relative;
  
  
    box-shadow: 0 0 #0000, 0 0 #0000, 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
    border: 2px solid #FFFFFF`;

  return divIcon({
    className: "my-custom-pin",
    iconAnchor: [0, 24],
    popupAnchor: [0, -36],
    html: `<span style="${markerHtmlStyles}" />`,
  });
};
