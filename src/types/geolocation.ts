import { SummaryData, UnassignedData } from "./optimized";
import { RouteData } from "./route";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type Address = {
  formatted: string;
  latitude: number;
  longitude: number;
};

export type MapPoint = {
  id: string;
  partnerId?: string;
  isAssigned?: boolean;
  type: "vehicle" | "job";
  lat: number;
  lng: number;
  name: string;
  address: string;
  color: string;
};

export type Polyline = {
  type: string;
  coordinates: [number, number][];
  properties?: {
    color: number;
  };
};
export type GeoJsonData = {
  type:
    | "FeatureCollection"
    | "Feature"
    | "Point"
    | "MultiPoint"
    | "LineString"
    | "MultiLineString"
    | "Polygon"
    | "MultiPolygon"
    | "GeometryCollection";
  features: {
    type:
      | "FeatureCollection"
      | "Feature"
      | "Point"
      | "MultiPoint"
      | "LineString"
      | "MultiLineString"
      | "Polygon"
      | "MultiPolygon"
      | "GeometryCollection";
    geometry: Polyline;
  }[];
};

export type OptimizationData = {
  code: number;
  routes: RouteData[];
  summary: SummaryData;
  unassigned: UnassignedData[];
};

export type VroomResponse = {
  geometry: Polyline[];
  data: OptimizationData;
};

export type LocationMessage = {
  error: boolean;
  message: string;
};
