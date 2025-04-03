import axios from "axios";

import { env } from "~/env";

type GeocodeResult = {
  full_address: string;
  lat: number;
  lon: number;
};

type GeocodingResponse = google.maps.GeocoderResponse;

type GoogleGeocodingResponse = {
  results: Array<{
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
    formatted_address: string;
    geometry: {
      bounds: {
        northeast: {
          lat: number;
          lng: number;
        };
        southwest: {
          lat: number;
          lng: number;
        };
      };
      location: {
        lat: number;
        lng: number;
      };
      location_type: string;
      viewport: {
        northeast: {
          lat: number;
          lng: number;
        };
        southwest: {
          lat: number;
          lng: number;
        };
      };
    };
    navigation_points?: Array<{
      location: {
        latitude: number;
        longitude: number;
      };
      restricted_travel_modes: string[];
    }>;
    place_id: string;
    types: string[];
  }>;
  status: string;
};

const geocodeCache: Record<string, unknown> = {};

export async function geocodeByAddress(address: string) {
  if (!geocodeCache[address]) {
    const endpointEncodedAddress = `${env.GOOGLE_GEOCODING_ENDPOINT}?address=${encodeURIComponent(
      address,
    )}&key=${env.GOOGLE_API_KEY}`;

    try {
      const results = await axios.get<GoogleGeocodingResponse>(
        endpointEncodedAddress,
      );

      console.log(results.data);

      if (results.status === 200 && results.data.results[0]) {
        const data = results.data.results[0];
        geocodeCache[address] = {
          full_address: data.formatted_address,
          lat: data.geometry.location.lat,
          lon: data.geometry.location.lng,
        };
      }
    } catch (error) {
      console.error("Failed to geocode address:", address, error);
    }
  }

  return geocodeCache[address] as GeocodeResult;
}
