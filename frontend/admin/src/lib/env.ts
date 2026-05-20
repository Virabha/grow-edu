import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z
    .string()
    .url("NEXT_PUBLIC_API_URL must be a valid URL")
    .default("http://localhost:6000"),
  NEXT_PUBLIC_LEARNER_URL: z
    .string()
    .url("NEXT_PUBLIC_LEARNER_URL must be a valid URL")
    .default("http://localhost:6002"),
});

function validateEnv() {
  const result = envSchema.safeParse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_LEARNER_URL: process.env.NEXT_PUBLIC_LEARNER_URL,
  });

  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(`[env] Invalid environment variables:\n${formatted}`);
    return envSchema.parse({});
  }

  return result.data;
}

export const env = validateEnv();
