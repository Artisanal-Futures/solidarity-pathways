import type { Email, EmailResponse } from "./types";

export interface EmailProcessor {
  sendEmail<EmailData>(props: Email<EmailData>): Promise<EmailResponse>;
}
