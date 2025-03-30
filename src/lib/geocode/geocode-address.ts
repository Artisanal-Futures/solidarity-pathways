/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { env } from "~/env";

type GeocodeResult = {
  full_address: string;
  lat: number;
  lon: number;
};

export async function geocodeAddress(address: string) {
  const geocodeCache: Record<string, unknown> = {};

  const geocode_this_address = `${address}`;
  if (!geocodeCache[geocode_this_address]) {
    const endpointEncodedAddress = `${env.GOOGLE_GEOCODING_ENDPOINT}?address=${encodeURIComponent(
      geocode_this_address,
    )}&key=${process.env.GOOGLE_API_KEY}`;

    try {
      const results = await axios.get(endpointEncodedAddress);

      if (results.status === 200) {
        const data = results.data.results[0];
        geocodeCache[geocode_this_address] = {
          full_address: data.formatted_address,
          lat: data.geometry.location.lat,
          lon: data.geometry.location.lng,
        };
      }
    } catch (error) {
      console.error("Failed to geocode address:", geocode_this_address, error);
    }
  }

  return geocodeCache[geocode_this_address] as GeocodeResult;
}
