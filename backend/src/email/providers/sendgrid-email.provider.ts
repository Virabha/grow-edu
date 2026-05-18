import { Injectable, Logger } from "@nestjs/common";
import * as sgMail from "@sendgrid/mail";
import { AppConfigService } from "../../config";
import { IEmailProvider } from "./email-provider.interface";

@Injectable()
export class SendGridEmailProvider implements IEmailProvider {
  private readonly logger = new Logger(SendGridEmailProvider.name);

  constructor(private configService: AppConfigService) {
    this.initializeSendGrid();
  }

  private initializeSendGrid(): void {
    const apiKey = this.configService.sendgridApiKey;
    if (!apiKey) {
      throw new Error(
        "SENDGRID_API_KEY is required when using SendGrid provider"
      );
    }
    sgMail.setApiKey(apiKey);
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    fromName: string,
    fromAddress: string
  ): Promise<void> {
    if (!fromAddress || fromAddress.trim().length === 0) {
      throw new Error(
        "From address is required. Please set EMAIL_FROM_ADDRESS in your environment variables."
      );
    }

    if (!fromName || fromName.trim().length === 0) {
      throw new Error(
        "From name is required. Please set EMAIL_FROM_NAME in your environment variables."
      );
    }

    try {
      const msg = {
        to,
        from: {
          email: fromAddress.trim(),
          name: fromName.trim(),
        },
        subject,
        html,
      };

      this.logger.debug(
        `Sending email via SendGrid from: ${fromName.trim()} <${fromAddress.trim()}> to: ${to}`
      );

      await sgMail.send(msg);
      this.logger.log(`Email sent successfully to ${to} via SendGrid`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to} via SendGrid:`, error);
      if (error instanceof Error && "response" in error) {
        const sgError = error as { response?: { body?: unknown } };
        this.logger.error("SendGrid error details:", sgError.response?.body);
      }
      throw error;
    }
  }
}
