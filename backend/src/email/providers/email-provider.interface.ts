export interface IEmailProvider {
  sendEmail(
    to: string,
    subject: string,
    html: string,
    fromName: string,
    fromAddress: string
  ): Promise<void>;
}

