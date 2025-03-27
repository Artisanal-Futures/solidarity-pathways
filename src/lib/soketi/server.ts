/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import PusherServer from "pusher";
import { env } from "~/env";

export const pusherServer = new PusherServer({
  appId: env.PUSHER_APP_ID,
  key: env.NEXT_PUBLIC_PUSHER_APP_KEY,
  secret: env.PUSHER_APP_SECRET,
  cluster: "",
  useTLS: env.NEXT_PUBLIC_PUSHER_PORT ? false : true,
  host: env.NEXT_PUBLIC_PUSHER_HOST,
  port: env.NEXT_PUBLIC_PUSHER_PORT ?? "",
});
