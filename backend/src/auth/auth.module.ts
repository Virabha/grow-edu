import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { DatabaseModule } from '../database/database.module';
import { AppConfigService } from '../config';
import { EmailModule } from '../email/email.module';
import { TokenService } from './token.service';

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
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    JwtStrategy,
    LocalStrategy,
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}

