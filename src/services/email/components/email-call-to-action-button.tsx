import * as React from "react";

import { Button } from "@react-email/components";

type Props = {
  link: string;
  label: string;
  style?: React.CSSProperties;
  isPreview?: boolean;
};

export const EmailCallToActionButton = (props: Props) => (
  <Button
    href={props.isPreview ? undefined : props.link}
    style={{
      background: "teal",
      color: "white",
      borderRadius: 4.5,
      margin: "36px 0 8px",
      padding: "13.5px 0",
      width: "100%",
      textAlign: "center",
      cursor: props.isPreview ? "not-allowed" : "pointer",
      opacity: props.isPreview ? 0.7 : 1,
      ...props.style,
    }}
  >
    {props.label} &nbsp; &rarr;
  </Button>
);
