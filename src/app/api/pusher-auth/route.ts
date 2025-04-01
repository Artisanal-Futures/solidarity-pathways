import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { pusherServer } from "~/lib/soketi/server";

export async function POST(req: NextRequest) {
  const data = await req.text();
  const [socketId, channelName] = data
    .split("&")
    .map((str) => str.split("=")[1]);

  const authResponse = pusherServer.authorizeChannel(socketId!, channelName!);

  return NextResponse.json(authResponse);
}
