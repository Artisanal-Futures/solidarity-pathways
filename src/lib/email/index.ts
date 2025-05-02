import { EmailProcessorFactory } from "./factory";

export const emailService = EmailProcessorFactory.createEmailService("resend");
