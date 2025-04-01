export type Email<EmailData> = {
  from: string;
  to: string;
  subject: string;
  data: EmailData;
  template: React.FC<EmailData>;
  cc?: string;
  userEmail?: string | undefined | null;
};

export type EmailResponse = {
  status: "success" | "error";
  message: string;
};
