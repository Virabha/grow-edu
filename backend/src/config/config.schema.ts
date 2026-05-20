import { z } from "zod";

export const configSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z
      .string()
      .transform(Number)
      .pipe(z.number().int().min(1).max(65535))
      .default("4000"),
    FRONTEND_URL: z.string().url().default("http://localhost:3000"),
    BACKEND_URL: z.string().url().default("http://localhost:4000"),
    CORS_ORIGINS: z.string().optional(),

    DATABASE_URL: z
      .string({ required_error: "DATABASE_URL is required" })
      .min(1, "DATABASE_URL cannot be empty"),

    JWT_SECRET: z
      .string({ required_error: "JWT_SECRET is required" })
      .min(8, "JWT_SECRET must be at least 8 characters"),
    JWT_EXPIRES_IN: z.string().default("7d"),

    // Bunny.net Storage
    BUNNY_STORAGE_ZONE_NAME: z.string().min(1).optional(),
    BUNNY_STORAGE_API_KEY: z.string().min(1).optional(),
    BUNNY_STORAGE_REGION: z.string().optional(),
    BUNNY_CDN_HOSTNAME: z.string().min(1).optional(),

    // Bunny Stream
    BUNNY_STREAM_LIBRARY_ID: z.string().min(1).optional(),
    BUNNY_STREAM_API_KEY: z.string().min(1).optional(),
    BUNNY_STREAM_CDN_HOSTNAME: z.string().min(1).optional(),
    BUNNY_STREAM_TOKEN_KEY: z.string().min(1).optional(),

    WEBHOOK_SECRET: z.string().optional(),

    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),

    PHONEPE_MERCHANT_ID: z.string().optional(),
    PHONEPE_SALT_KEY: z.string().optional(),
    PHONEPE_SALT_INDEX: z.string().optional(),
    PHONEPE_BASE_URL: z.string().url().optional(),
    PHONEPE_REDIRECT_URL: z.string().url().optional(),

    EMAIL_PROVIDER: z.enum(["ses", "sendgrid"]).default("sendgrid"),
    EMAIL_FROM_NAME: z.string().default("grotutor"),
    EMAIL_FROM_ADDRESS: z.string().email().optional(),

    SENDGRID_API_KEY: z.string().optional(),

    REDIS_URL: z.string().url().optional(),
    PEXELS_API_KEY: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production") {
      if (!data.JWT_SECRET || data.JWT_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "JWT_SECRET must be at least 32 characters in production",
          path: ["JWT_SECRET"],
        });
      }
    }

    if (data.EMAIL_PROVIDER === "sendgrid" && !data.SENDGRID_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SENDGRID_API_KEY is required when EMAIL_PROVIDER=sendgrid",
        path: ["SENDGRID_API_KEY"],
      });
    }
  });

export type ConfigSchema = z.infer<typeof configSchema>;
