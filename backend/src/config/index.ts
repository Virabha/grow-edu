/**
 * Centralized configuration module
 * 
 * This module provides type-safe access to environment variables
 * with Zod validation. Import AppConfigService to access config values.
 * 
 * @example
 * ```typescript
 * import { AppConfigService } from './config';
 * 
 * constructor(private configService: AppConfigService) {
 *   const dbUrl = this.configService.databaseUrl;
 *   const isDev = this.configService.isDevelopment();
 * }
 * ```
 */

export { AppConfigService } from './config.service';
export { AppConfigModule } from './config.module';
export { configSchema, type ConfigSchema } from './config.schema';

