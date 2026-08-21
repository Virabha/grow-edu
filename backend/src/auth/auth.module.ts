import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SecondFactorController } from './second-factor.controller';
import { SecondFactorService } from './second-factor.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { DatabaseModule } from '../database/database.module';
import { AppConfigService } from '../config';
import { EmailModule } from '../email/email.module';
import { TokenService } from './token.service';
import { ThrottlerExceptionFilter } from '../common/throttling/throttler-exception.filter';
import { PerEmailThrottlerGuard } from './guards/per-email-throttler.guard';

@Module({
  imports: [
    DatabaseModule,
    PassportModule,
    EmailModule,
    JwtModule.registerAsync({
      useFactory: async (configService: AppConfigService) => ({
        secret: configService.jwtSecret,
        signOptions: { expiresIn: configService.jwtExpiresIn },
      }),
      inject: [AppConfigService],
    }),
  ],
  controllers: [AuthController, SecondFactorController],
  providers: [
    AuthService,
    SecondFactorService,
    TokenService,
    JwtStrategy,
    LocalStrategy,
    PerEmailThrottlerGuard,
    { provide: APP_FILTER, useClass: ThrottlerExceptionFilter },
  ],
  exports: [AuthService, SecondFactorService, JwtModule],
})
export class AuthModule {}

