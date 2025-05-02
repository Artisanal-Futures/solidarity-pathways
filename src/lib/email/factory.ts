import { type EmailProcessor } from "./email-processor";
import { ResendEmailProcessor } from "./processors/resend";

export class EmailProcessorFactory {
  static createEmailService(processorType: string): EmailProcessor {
    switch (processorType) {
      case "resend":
        return new ResendEmailProcessor();

      default:
        throw new Error("Unsupported email processor type");
    }
  }
}
