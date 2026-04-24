import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private config: ConfigService) {
    // ⚠️ JWT_SECRET DEBE estar definido en el .env de producción.
    // El fallback solo evita el error de TypeScript en dev cuando .env aún no existe.
    const secret = config.get<string>('JWT_SECRET') ?? 'dev-secret-change-me-in-production';

    super({
      jwtFromRequest:    ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration:  false,
      secretOrKey:       secret,
    });
  }

  async validate(payload: any) {
    if (!payload?.sub) throw new UnauthorizedException();
    return {
      id:    payload.sub,
      email: payload.email,
      role:  payload.role,
      name:  payload.name,
    };
  }
}
