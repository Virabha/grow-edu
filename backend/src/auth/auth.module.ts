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
import { PerPhoneThrottlerGuard } from './guards/per-phone-throttler.guard';
import { IdentityService } from './identity.service';
import { DiscoveryModule } from '../discovery/discovery.module';
import { PhoneSignInService } from './phone-sign-in.service';
import { PhoneSignInController } from './phone-sign-in.controller';
import { GoogleSignInService } from './google-sign-in.service';
import { GoogleSignInController } from './google-sign-in.controller';
import { IdentityController } from './identity.controller';
import { SMS_SENDER, LogSmsSender } from './ports/sms-sender';
import {
  GOOGLE_TOKEN_VERIFIER,
} from './ports/google-token-verifier';
import { HttpGoogleTokenVerifier } from './ports/http-google-token-verifier';

@Module({
  imports: [
    DatabaseModule,
    PassportModule,
    EmailModule,
    DiscoveryModule,
    JwtModule.registerAsync({
      useFactory: async (configService: AppConfigService) => ({
        secret: configService.jwtSecret,
        signOptions: { expiresIn: configService.jwtExpiresIn },
      }),
      inject: [AppConfigService],
    }),
  ],
  controllers: [
    AuthController,
    SecondFactorController,
    PhoneSignInController,
    GoogleSignInController,
    IdentityController,
  ],
  providers: [
    AuthService,
    SecondFactorService,
    TokenService,
    JwtStrategy,
    LocalStrategy,
    PerEmailThrottlerGuard,
    PerPhoneThrottlerGuard,
    IdentityService,
    PhoneSignInService,
    GoogleSignInService,
    { provide: SMS_SENDER, useClass: LogSmsSender },
    { provide: GOOGLE_TOKEN_VERIFIER, useClass: HttpGoogleTokenVerifier },
    { provide: APP_FILTER, useClass: ThrottlerExceptionFilter },
  ],
  exports: [AuthService, SecondFactorService, JwtModule, IdentityService],
})
export class AuthModule {}
