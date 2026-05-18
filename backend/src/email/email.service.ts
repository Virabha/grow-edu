import { Injectable, Inject, Logger } from "@nestjs/common";
import * as handlebars from "handlebars";
import { AppConfigService } from "../config";
import * as fs from "fs";
import * as path from "path";
import {
  WelcomeEmailData,
  VerifyEmailData,
  ForgotPasswordEmailData,
  ResetPasswordConfirmationEmailData,
  PasswordChangedEmailData,
  PaymentConfirmationEmailData,
  EnrollmentConfirmationEmailData,
  CourseCompletionEmailData,
  VideoEncodingCompleteEmailData,
  VideoEncodingFailedEmailData,
  RoleChangeEmailData,
  CourseApprovedEmailData,
  CourseRejectedEmailData,
  CourseChangesRequestedEmailData,
} from "./interfaces/email-data.interface";
import { IEmailProvider } from "./providers/email-provider.interface";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private templatesPath: string;
  private compiledTemplates: Map<string, handlebars.TemplateDelegate> =
    new Map();

  constructor(
    private configService: AppConfigService,
    @Inject("EMAIL_PROVIDER") private emailProvider: IEmailProvider
  ) {
    this.templatesPath = this.resolveTemplatesPath();
    this.registerHandlebarsHelpers();
    this.registerHandlebarsPartials();
  }

  private resolveTemplatesPath(): string {
    const compiledPath = path.join(__dirname, "templates");

    if (fs.existsSync(compiledPath)) {
      return compiledPath;
    }

    const alternativePath = path.join(
      __dirname,
      "..",
      "..",
      "email",
      "templates"
    );
    if (fs.existsSync(alternativePath)) {
      return alternativePath;
    }

    const projectRoot = path.resolve(__dirname, "..", "..", "..");
    const sourcePath = path.join(projectRoot, "src", "email", "templates");
    if (fs.existsSync(sourcePath)) {
      return sourcePath;
    }

    throw new Error(
      `Templates directory not found. Checked: ${compiledPath}, ${alternativePath}, and ${sourcePath}`
    );
  }

  private registerHandlebarsHelpers(): void {
    handlebars.registerHelper("eq", (a, b) => a === b);
    handlebars.registerHelper("ne", (a, b) => a !== b);
    handlebars.registerHelper("or", (a, b) => a || b);
    handlebars.registerHelper(
      "default",
      (value, defaultValue) => value || defaultValue
    );
  }

  private registerHandlebarsPartials(): void {
    try {
      const partialsPath = path.join(this.templatesPath, "partials");
      const headerPath = path.join(partialsPath, "header.hbs");
      const footerPath = path.join(partialsPath, "footer.hbs");

      const headerSource = fs.readFileSync(headerPath, "utf-8");
      const footerSource = fs.readFileSync(footerPath, "utf-8");

      handlebars.registerPartial("header", headerSource);
      handlebars.registerPartial("footer", footerSource);
    } catch (error) {
      this.logger.error("Failed to register Handlebars partials:", error);
      throw new Error("Failed to load email template partials");
    }
  }

  private async getCompiledTemplate(
    templateName: string
  ): Promise<handlebars.TemplateDelegate> {
    if (this.compiledTemplates.has(templateName)) {
      return this.compiledTemplates.get(templateName)!;
    }

    const templatePath = path.join(this.templatesPath, `${templateName}.hbs`);
    try {
      const templateSource = await fs.promises.readFile(templatePath, "utf-8");
      const compiled = handlebars.compile(templateSource);
      this.compiledTemplates.set(templateName, compiled);
      return compiled;
    } catch (error) {
      this.logger.error(`Failed to load template ${templateName}:`, error);
      throw new Error(`Template ${templateName} not found`);
    }
  }

  private prepareTemplateData(data: Record<string, any>): Record<string, any> {
    return {
      ...data,
      frontendUrl: this.configService.frontendUrl,
      emailFromName: this.configService.emailFromName,
    };
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string
  ): Promise<void> {
    const fromAddress = this.configService.emailFromAddress;
    if (!fromAddress) {
      throw new Error("EMAIL_FROM_ADDRESS is required to send emails. Set it in your .env file.");
    }
    await this.emailProvider.sendEmail(
      to,
      subject,
      html,
      this.configService.emailFromName,
      fromAddress
    );
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
    const template = await this.getCompiledTemplate("welcome-email");
    const templateData = this.prepareTemplateData({
      firstName: data.firstName || "there",
      email: data.email,
    });
    const html = template(templateData);
    await this.sendEmail(data.email, "Welcome to Loshi Edu!", html);
  }

  async sendVerificationEmail(data: VerifyEmailData): Promise<void> {
    const template = await this.getCompiledTemplate("verify-email");
    const templateData = this.prepareTemplateData({
      firstName: data.firstName || "there",
      email: data.email,
      verificationUrl: data.verificationUrl,
    });
    const html = template(templateData);
    await this.sendEmail(data.email, "Verify Your Email Address", html);
  }

  async sendForgotPasswordEmail(data: ForgotPasswordEmailData): Promise<void> {
    const template = await this.getCompiledTemplate("forgot-password-email");
    const templateData = this.prepareTemplateData({
      firstName: data.firstName || "there",
      email: data.email,
      resetUrl: data.resetUrl,
    });
    const html = template(templateData);
    await this.sendEmail(data.email, "Reset Your Password", html);
  }

  async sendResetPasswordConfirmationEmail(
    data: ResetPasswordConfirmationEmailData
  ): Promise<void> {
    const template = await this.getCompiledTemplate(
      "reset-password-confirmation-email"
    );
    const templateData = this.prepareTemplateData({
      firstName: data.firstName || "there",
      email: data.email,
    });
    const html = template(templateData);
    await this.sendEmail(data.email, "Password Reset Successful", html);
  }

  async sendPasswordChangedEmail(
    data: PasswordChangedEmailData
  ): Promise<void> {
    const template = await this.getCompiledTemplate("password-changed-email");
    const templateData = this.prepareTemplateData({
      firstName: data.firstName || "there",
      email: data.email,
    });
    const html = template(templateData);
    await this.sendEmail(data.email, "Your Password Has Been Changed", html);
  }

  async sendPaymentConfirmationEmail(
    data: PaymentConfirmationEmailData
  ): Promise<void> {
    const template = await this.getCompiledTemplate(
      "payment-confirmation-email"
    );
    const templateData = this.prepareTemplateData({
      firstName: data.firstName || "there",
      email: data.email,
      paymentId: data.paymentId,
      amount: data.amount,
      currency: data.currency,
      items: data.items,
      receiptUrl: data.receiptUrl || "#",
    });
    const html = template(templateData);
    await this.sendEmail(data.email, "Payment Confirmation", html);
  }

  async sendEnrollmentConfirmationEmail(
    data: EnrollmentConfirmationEmailData
  ): Promise<void> {
    const template = await this.getCompiledTemplate(
      "enrollment-confirmation-email"
    );
    const enrollmentDate = data.enrollmentDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const templateData = this.prepareTemplateData({
      firstName: data.firstName || "there",
      email: data.email,
      courseTitle: data.courseTitle,
      courseSlug: data.courseSlug,
      enrollmentDate,
    });
    const html = template(templateData);
    await this.sendEmail(data.email, "Course Enrollment Confirmation", html);
  }

  async sendCourseCompletionEmail(
    data: CourseCompletionEmailData
  ): Promise<void> {
    const template = await this.getCompiledTemplate("course-completion-email");
    const completedDate = data.completedDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const templateData = this.prepareTemplateData({
      firstName: data.firstName || "there",
      email: data.email,
      courseTitle: data.courseTitle,
      courseSlug: data.courseSlug,
      completedDate,
    });
    const html = template(templateData);
    await this.sendEmail(data.email, "Congratulations! Course Completed", html);
  }

  async sendVideoEncodingCompleteEmail(
    data: VideoEncodingCompleteEmailData
  ): Promise<void> {
    const template = await this.getCompiledTemplate("video-encoding-complete");
    const templateData = this.prepareTemplateData({
      firstName: data.firstName || "there",
      email: data.email,
      lessonTitle: data.lessonTitle,
      courseTitle: data.courseTitle,
      courseSlug: data.courseSlug,
      lessonId: data.lessonId,
    });
    const html = template(templateData);
    await this.sendEmail(data.email, "Video Encoding Complete", html);
  }

  async sendVideoEncodingFailedEmail(
    data: VideoEncodingFailedEmailData
  ): Promise<void> {
    const template = await this.getCompiledTemplate("video-encoding-failed");
    const templateData = this.prepareTemplateData({
      firstName: data.firstName || "there",
      email: data.email,
      lessonTitle: data.lessonTitle,
      courseTitle: data.courseTitle,
      courseSlug: data.courseSlug,
      lessonId: data.lessonId,
      errorMessage: data.errorMessage,
    });
    const html = template(templateData);
    await this.sendEmail(data.email, "Video Encoding Failed", html);
  }

  async sendRoleChangeEmail(data: RoleChangeEmailData): Promise<void> {
    const template = await this.getCompiledTemplate("role-change-email");
    const roleDisplayMap: Record<string, string> = {
      LEARNER: "Learner",
      INSTRUCTOR: "Instructor",
      CORPORATE_ADMIN: "Corporate Admin",
      PLATFORM_ADMIN: "Platform Admin",
    };
    const templateData = this.prepareTemplateData({
      firstName: data.firstName || "there",
      email: data.email,
      newRole: roleDisplayMap[data.newRole] || data.newRole,
      oldRole: roleDisplayMap[data.oldRole] || data.oldRole,
    });
    const html = template(templateData);
    await this.sendEmail(data.email, "Your Account Role Has Been Updated", html);
  }

  async sendCourseApprovedEmail(data: CourseApprovedEmailData): Promise<void> {
    const template = await this.getCompiledTemplate("course-approved-email");
    const templateData = this.prepareTemplateData({
      firstName: data.firstName || "there",
      email: data.email,
      courseId: data.courseId,
      courseTitle: data.courseTitle,
      reviewNotes: data.reviewNotes || null,
      publish: data.publish,
    });
    const html = template(templateData);
    await this.sendEmail(
      data.email,
      `Course Approved: ${data.courseTitle}`,
      html
    );
  }

  async sendCourseRejectedEmail(data: CourseRejectedEmailData): Promise<void> {
    const template = await this.getCompiledTemplate("course-rejected-email");
    const templateData = this.prepareTemplateData({
      firstName: data.firstName || "there",
      email: data.email,
      courseId: data.courseId,
      courseTitle: data.courseTitle,
      rejectionReason: data.rejectionReason,
    });
    const html = template(templateData);
    await this.sendEmail(
      data.email,
      `Course Review Update: ${data.courseTitle}`,
      html
    );
  }

  async sendCourseChangesRequestedEmail(
    data: CourseChangesRequestedEmailData
  ): Promise<void> {
    const template = await this.getCompiledTemplate(
      "course-changes-requested-email"
    );
    const templateData = this.prepareTemplateData({
      firstName: data.firstName || "there",
      email: data.email,
      courseId: data.courseId,
      courseTitle: data.courseTitle,
      reviewNotes: data.reviewNotes,
    });
    const html = template(templateData);
    await this.sendEmail(
      data.email,
      `Changes Requested: ${data.courseTitle}`,
      html
    );
  }
}
