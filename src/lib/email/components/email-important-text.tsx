import { Text } from "@react-email/components";
import * as React from "react";

type Props = { children: React.ReactNode; style?: React.CSSProperties };

export const EmailImportantText = (props: Props) => (
  <Text
    style={{
      fontWeight: "bold",
      fontSize: 16,
      ...props.style,
    }}
  >
    {props.children}
  </Text>
);
