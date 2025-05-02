/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import PusherClient from "pusher-js";

import { env } from "~/env";

export const pusherClient = new PusherClient(env.NEXT_PUBLIC_PUSHER_APP_KEY, {
  cluster: "",
  httpHost: env.NEXT_PUBLIC_PUSHER_HOST,
  httpPort: 443,
  wsHost: env.NEXT_PUBLIC_PUSHER_HOST,
  wsPort: 443,
  wssPort: 443,
  forceTLS: false,
  enabledTransports: ["ws", "wss"],
});
