import * as React from "react";
import { SingleColumn } from "responsive-react-email";

import { Text } from "@react-email/components";

export const EmailSignature = () => (
  <SingleColumn pX={25}>
    <Text>
      Best regards, <br />
      <strong>Team Artisanal Futures</strong>
    </Text>
  </SingleColumn>
);
