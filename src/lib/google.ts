"use server";

import {
  Client,
  PlaceAutocompleteType,
} from "@googlemaps/google-maps-services-js";

const client = new Client();
export const autocomplete = async (input: string) => {
  if (!input) return [];

  try {
    const response = await client.placeAutocomplete({
      params: {
        input,
        key: process.env.GOOGLE_API_KEY!,
      },
    });

    return response.data.predictions;
  } catch (error) {
    console.error(error);
  }
};

export const getLatLng = async (placeId: string) => {
  const response = await client.geocode({
    params: {
      place_id: placeId,
      key: process.env.GOOGLE_API_KEY!,
    },
  });

  return response.data.results;
};
