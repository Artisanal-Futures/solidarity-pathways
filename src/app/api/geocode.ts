/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { NextApiRequest, NextApiResponse } from "next";
import geocodingService from "~/services/autocomplete";

const geocodeHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
  }

  try {
    const { address } = req.body;

    const apiResponse = await geocodingService.fetchDataFromGeoEndpoint(
      address as string,
    );

    res.status(200).json(apiResponse);
  } catch (error) {
    res.status(400).json(error);
  }
};
export default geocodeHandler;
