import { type CreateEmailOptions } from "resend";

import type { EmailProcessor } from "../email-processor";
import type { Email, EmailResponse } from "../types";
import { resend } from "../clients/resend";

export class ResendEmailProcessor implements EmailProcessor {
  async sendEmail<EmailData>(props: Email<EmailData>): Promise<EmailResponse> {
    try {
      const res = await resend.emails.send({
        from: props.from,
        to: props.to,
        cc: props?.cc ?? undefined,
        subject: props.subject,
        react: props.template(props.data),
      } as CreateEmailOptions);

      return {
        status: res?.error ? "error" : "success",
        message: res?.error ? res?.error?.message : "Email sent successfully",
      };
    } catch (e) {
      console.error("sendEmail error: ", e);
      return {
        status: "error",
        message: "Failed to send email",
      };
    }
  }
}
