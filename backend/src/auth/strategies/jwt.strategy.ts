import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../config';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  deviceId?: string;
  impersonatorId?: string;
}

interface UserFromJwt {
  userId: string;
  email: string;
  role: string;
  deviceId?: string;
  impersonatorId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<UserFromJwt> {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      deviceId: payload.deviceId,
      impersonatorId: payload.impersonatorId,
    };
  }
}

