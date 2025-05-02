import * as React from "react";

import { Img } from "@react-email/components";

import { env } from "~/env";

export const EmailLogo = () => (
  <Img src={env.NEXT_PUBLIC_LOGO_URL} width="64" height="64" alt="Logo" />
);
