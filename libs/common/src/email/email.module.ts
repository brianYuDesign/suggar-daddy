import { Module, DynamicModule, Logger } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { existsSync } from 'fs';
import { AppConfigService } from '../config/app.config';
import { EmailService } from './email.service';

@Module({})
export class EmailModule {
  private static readonly logger = new Logger(EmailModule.name);

  static forRoot(): DynamicModule {
    return {
      module: EmailModule,
      imports: [
        MailerModule.forRootAsync({
          inject: [AppConfigService],
          useFactory: (config: AppConfigService) => {
            // 嘗試多個可能的模板路徑
            const possiblePaths = [
              join(__dirname, 'templates'),
              join(process.cwd(), 'libs/common/src/email/templates'),
              join(process.cwd(), 'dist/libs/common/email/templates'),
              '/app/libs/common/src/email/templates',
            ];

            let templateDir = possiblePaths[0];
            for (const path of possiblePaths) {
              if (existsSync(path)) {
                templateDir = path;
                EmailModule.logger.log(`Using email template directory: ${templateDir}`);
                break;
              }
            }

            if (!existsSync(templateDir)) {
              EmailModule.logger.warn(
                `Email template directory not found. Tried: ${possiblePaths.join(', ')}`
              );
            }

            return {
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
                dir: templateDir,
                adapter: new HandlebarsAdapter(),
                options: { strict: true },
              },
            };
          },
        }),
      ],
      providers: [EmailService],
      exports: [EmailService],
    };
  }
}
