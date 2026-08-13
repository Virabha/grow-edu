import { Injectable, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { users } from '../database/schema';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { RegisterDto } from './dto/register.dto';
import { EmailService } from '../email/email.service';
import { TokenService } from './token.service';
import { AppConfigService } from '../config';

export interface UserPayload {
  id: string;
  email: string;
  role: string;
  firstName?: string | null;
  lastName?: string | null;
}

const userPublicColumns = {
  userId: users.userId,
  email: users.email,
  role: users.role,
  firstName: users.firstName,
  lastName: users.lastName,
  emailVerified: users.emailVerified,
};

// Pre-computed bcrypt hash used to keep forgot-password response time
// constant whether the email exists or not (prevents enumeration).
const DUMMY_PASSWORD_HASH =
  '$2b$10$CwTycUXWue0Thq9StjUM0uJ8L3pPSWBLm0rZIIYTjGsNS6.zb3oUe';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private emailService: EmailService,
    private tokenService: TokenService,
    private configService: AppConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<UserPayload | null> {
    const [user] = await this.db
      .select({
        userId: users.userId,
        email: users.email,
        role: users.role,
        firstName: users.firstName,
        lastName: users.lastName,
        password: users.password,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return null;
    }

    const isPasswordValid = await this.comparePassword(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return {
      id: user.userId,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  async register(dto: RegisterDto): Promise<{ message: string; email: string }> {
    const [existingUser] = await this.db
      .select({ userId: users.userId })
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await this.hashPassword(dto.password);

    const [newUser] = await this.db
      .insert(users)
      .values({
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName || null,
        lastName: dto.lastName || null,
        role: 'LEARNER',
        emailVerified: false,
      })
      .returning({
        userId: users.userId,
        email: users.email,
        role: users.role,
        firstName: users.firstName,
        lastName: users.lastName,
      });

    try {
      const verificationToken = await this.tokenService.generateToken(
        newUser.userId,
        'EMAIL_VERIFICATION',
      );
      const verificationUrl = `${this.configService.frontendUrl}/verify-email?token=${verificationToken}`;

      await this.emailService.sendVerificationEmail({
        firstName: newUser.firstName,
        email: newUser.email,
        verificationUrl,
      });
    } catch (err) {
      this.logger.warn(
        `Verification email failed for ${newUser.email}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    return {
      message: 'Registration successful. Please check your email to verify your account.',
      email: newUser.email,
    };
  }

  async login(user: UserPayload): Promise<{ access_token: string; user: UserPayload }> {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const [user] = await this.db
      .select(userPublicColumns)
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const genericResponse = {
      message:
        'If an account exists with this email, a password reset link has been sent.',
    };

    if (!user) {
      await bcrypt.compare('dummy-payload', DUMMY_PASSWORD_HASH);
      return genericResponse;
    }

    try {
      await this.tokenService.invalidateUserTokens(user.userId, 'PASSWORD_RESET');
      const resetToken = await this.tokenService.generateToken(
        user.userId,
        'PASSWORD_RESET',
      );
      const resetUrl = `${this.configService.frontendUrl}/reset-password?token=${resetToken}`;

      await this.emailService.sendForgotPasswordEmail({
        firstName: user.firstName,
        email: user.email,
        resetUrl,
      });
    } catch (err) {
      this.logger.warn(
        `Forgot-password email failed for ${email}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    return genericResponse;
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const userId = await this.tokenService.validateToken(token, 'PASSWORD_RESET');

    if (!userId) {
      throw new BadRequestException('Password reset token is invalid or expired');
    }

    const [user] = await this.db
      .select(userPublicColumns)
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const hashedPassword = await this.hashPassword(newPassword);

    await this.db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.userId, userId));

    await this.tokenService.invalidateToken(token, 'PASSWORD_RESET');

    try {
      await this.emailService.sendResetPasswordConfirmationEmail({
        firstName: user.firstName,
        email: user.email,
      });
    } catch (err) {
      this.logger.warn(
        `Reset-password confirmation email failed for ${user.email}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    return { message: 'Password has been reset successfully' };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const userId = await this.tokenService.validateToken(token, 'EMAIL_VERIFICATION');

    if (!userId) {
      throw new BadRequestException('Email verification token is invalid or expired');
    }

    const [user] = await this.db
      .select(userPublicColumns)
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.emailVerified) {
      return { message: 'Email is already verified' };
    }

    await this.db
      .update(users)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(users.userId, userId));

    await this.tokenService.invalidateToken(token, 'EMAIL_VERIFICATION');

    try {
      await this.emailService.sendWelcomeEmail({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      });
    } catch (err) {
      this.logger.warn(
        `Welcome email failed for ${user.email}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    return { message: 'Email has been verified successfully' };
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
