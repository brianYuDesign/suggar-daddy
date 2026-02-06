import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export interface SwaggerConfig {
  title: string;
  description: string;
  version: string;
  tag?: string;
  path?: string;
}

export const setupSwagger = (
  app: INestApplication,
  config: SwaggerConfig,
): void => {
  const documentConfig = new DocumentBuilder()
    .setTitle(config.title)
    .setDescription(config.description)
    .setVersion(config.version)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag(config.tag || 'API')
    .build();

  const document = SwaggerModule.createDocument(app, documentConfig);
  SwaggerModule.setup(config.path || 'api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: config.title,
    customCss: '.swagger-ui .topbar { display: none }',
  });

  console.log(`Swagger documentation available at: /${config.path || 'api'}`);
};