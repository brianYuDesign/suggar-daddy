import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly mailer: MailerService) {}

  async sendEmailVerification(email: string, token: string, baseUrl: string): Promise<void> {
    const verifyUrl = `${baseUrl}/api/auth/verify-email/${token}`;
    try {
      await this.mailer.sendMail({
        to: email,
        subject: 'Verify your email',
        template: 'email-verification',
        context: { verifyUrl, email },
      });
      this.logger.log(`Verification email sent to ${email}`);
    } catch (err) {
      this.logger.error(`Failed to send verification email to ${email}: ${err}`);
    }
  }

  async sendPasswordReset(email: string, token: string, baseUrl: string): Promise<void> {
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    try {
      await this.mailer.sendMail({
        to: email,
        subject: 'Reset your password',
        template: 'password-reset',
        context: { resetUrl, email },
      });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (err) {
      this.logger.error(`Failed to send password reset email to ${email}: ${err}`);
    }
  }
}
