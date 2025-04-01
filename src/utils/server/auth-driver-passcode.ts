import * as crypto from "crypto";
import { serialize } from "cookie";

export function generatePassCode(email: string): string {
  // Create a SHA-256 hash
  const hash = crypto.createHash("sha256");
  // Update the hash with the email
  hash.update(email);
  // Get the hashed value as a hexadecimal string
  const hashedEmail = hash.digest("hex");
  // Take the first 6 characters of the hashed email
  const passCode = hashedEmail.substring(0, 6);
  return passCode;
}

export const generateDriverPassCode = (props: {
  pathId: string;
  depotCode: string;
  email: string;
}) => {
  return generatePassCode(`${props.pathId}${props.depotCode}${props.email}`);
};

export const verifyDriverPassCode = (props: {
  passcode: string;
  pathId: string;
  depotCode: string;
  email: string;
}) => {
  return (
    generateDriverPassCode({
      pathId: props.pathId,
      depotCode: props.depotCode,
      email: props.email,
    }) === props.passcode
  );
};

export const createDriverVerificationCookie = (props: {
  passcode: string;
  minuteDuration: number;
}) => {
  const expiresAt = 60 * 1000 * props.minuteDuration;
  const cookie = serialize("verifiedDriver", props.passcode, {
    path: "/",
    httpOnly: true,
    expires: new Date(Date.now() + expiresAt),
  });

  return cookie;
};
