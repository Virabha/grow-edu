import { Module } from "@nestjs/common";
import { EmailService } from "./email.service";
import { AppConfigModule } from "../config/config.module";
import { SendGridEmailProvider } from "./providers/sendgrid-email.provider";

@Module({
  imports: [AppConfigModule],
  providers: [
    SendGridEmailProvider,
    {
      provide: "EMAIL_PROVIDER",
      useExisting: SendGridEmailProvider,
    },
    EmailService,
  ],
  exports: [EmailService],
})
export class EmailModule {}
