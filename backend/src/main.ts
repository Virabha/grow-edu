import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { json, urlencoded } from "express";
import { AppModule } from "./app.module";
import { AppConfigService } from "./config";
import { AggregateErrorExceptionFilter } from "./filters/aggregate-error.exception-filter";

const logger = new Logger("Bootstrap");

function logError(error: unknown): void {
  if (error instanceof AggregateError && error.errors?.length) {
    logger.error(`AggregateError (${error.errors.length} error(s)):`);
    error.errors.forEach((e, i) => {
      logger.error(`  [${i}] ${e instanceof Error ? e.message : String(e)}`);
      if (e instanceof Error && e.stack) logger.error(e.stack);
    });
  } else {
    logger.error("Failed to start application", error);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.useGlobalFilters(new AggregateErrorExceptionFilter());
  const configService = app.get(AppConfigService);

  app.enableCors({ origin: configService.corsOrigins, credentials: true });
  app.use(json({ limit: "50mb" }));
  app.use(urlencoded({ extended: true, limit: "50mb" }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Loshi Edu API")
    .setDescription("API documentation for Loshi Edu — Education & Training Platform")
    .setVersion("1.0.0")
    .addBearerAuth()
    .addTag("auth", "Authentication endpoints")
    .addTag("users", "User management endpoints")
    .addTag("courses", "Course management endpoints")
    .addTag("categories", "Category management endpoints")
    .addTag("enrollments", "Enrollment management endpoints")
    .addTag("payments", "Payment processing endpoints")
    .addTag("companies", "Company management endpoints")
    .addTag("analytics", "Analytics and reporting endpoints")
    .addTag("cms", "Content management endpoints")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api-docs", app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = configService.port;
  await app.listen(port, "0.0.0.0");
  logger.log(`Loshi Edu API running on http://localhost:${port}`);
  logger.log(`Swagger docs at http://localhost:${port}/api-docs`);
}

bootstrap().catch((error) => {
  logError(error);
  process.exit(1);
});
