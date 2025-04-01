import { Body, Container, Head, Html, Preview } from "@react-email/components";

type EmailBodyProps = {
  previewText: string;
  children: React.ReactNode;
  isPreview?: boolean;
};

export const EmailBody = ({ isPreview = false, ...props }: EmailBodyProps) =>
  isPreview ? (
    <Container style={isPreview ? container : shadowContainer}>
      {props.children}
    </Container>
  ) : (
    <Html>
      <Head />
      <Preview>{props.previewText}</Preview>
      <Body style={main}>
        <Container style={shadowContainer}>{props.children}</Container>
      </Body>
    </Html>
  );

const main = {
  fontFamily: '"Helvetica Neue",Helvetica,Arial,sans-serif',
  background: "#fff",
};

const shadowContainer = {
  backgroundColor: "#ffffff",
  border: "1px solid #eee",
  borderRadius: "5px",
  boxShadow: "0 5px 10px rgba(20,50,70,.2)",
  marginTop: "20px",
  margin: "0 auto",
  padding: "68px 0 130px",
};

const container = {
  backgroundColor: "#ffffff",
  color: "#000000",

  // border: "1px solid #eee",
  borderRadius: "5px",
  // boxShadow: "0 5px 10px rgba(20,50,70,.2)",
  marginTop: "20px",
  margin: "0 auto",
  padding: "68px 0 130px",
};
