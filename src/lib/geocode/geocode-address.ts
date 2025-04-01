import axios from "axios";

import { env } from "~/env";

type GeocodeResult = {
  full_address: string;
  lat: number;
  lon: number;
};

type GeocodingResponse = google.maps.GeocoderResponse;

const geocodeCache: Record<string, unknown> = {};

export async function geocodeByAddress(address: string) {
  if (!geocodeCache[address]) {
    const endpointEncodedAddress = `${env.GOOGLE_GEOCODING_ENDPOINT}?address=${encodeURIComponent(
      address,
    )}&key=${env.GOOGLE_API_KEY}`;

    try {
      const results = await axios.get<GeocodingResponse>(
        endpointEncodedAddress,
      );

      if (results.status === 200 && results.data.results[0]) {
        const data = results.data.results[0];
        geocodeCache[address] = {
          full_address: data.formatted_address,
          lat: data.geometry.location.lat(),
          lon: data.geometry.location.lng(),
        };
      }
    } catch (error) {
      console.error("Failed to geocode address:", address, error);
    }
  }

  return geocodeCache[address] as GeocodeResult;
}
