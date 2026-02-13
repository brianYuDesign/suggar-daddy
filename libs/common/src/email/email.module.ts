import { Module, DynamicModule } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { AppConfigService } from '../config/app.config';
import { EmailService } from './email.service';

@Module({})
export class EmailModule {
  static forRoot(): DynamicModule {
    return {
      module: EmailModule,
      imports: [
        MailerModule.forRootAsync({
          inject: [AppConfigService],
          useFactory: (config: AppConfigService) => ({
            transport: {
              host: config.smtpHost,
              port: config.smtpPort,
              secure: config.smtpPort === 465,
              auth:
                config.smtpUser
                  ? { user: config.smtpUser, pass: config.smtpPassword }
                  : undefined,
            },
            defaults: {
              from: config.emailFrom,
            },
            template: {
              dir: join(__dirname, 'templates'),
              adapter: new HandlebarsAdapter(),
              options: { strict: true },
            },
          }),
        }),
      ],
      providers: [EmailService],
      exports: [EmailService],
    };
  }
}
