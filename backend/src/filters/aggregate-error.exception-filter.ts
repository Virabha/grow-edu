import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Logger,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";

const logger = new Logger("AggregateErrorFilter");

@Catch(AggregateError)
export class AggregateErrorExceptionFilter implements ExceptionFilter {
  catch(exception: AggregateError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    const errors = exception.errors ?? [];
    const messages = errors.map((e) => (e instanceof Error ? e.message : String(e)));

    logger.error(
      `AggregateError (${errors.length} error(s)): ${messages.join("; ")}`,
    );
    errors.forEach((err, i) => {
      if (err instanceof Error && err.stack) {
        logger.error(`  [${i}] ${err.stack}`);
      } else {
        logger.error(`  [${i}] ${String(err)}`);
      }
    });

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Internal server error",
    });
  }
}
