import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configuração de CORS dinâmica baseada em variáveis de ambiente
  const corsOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3025'];

  console.log('Origens CORS permitidas:', corsOrigins);

  // Habilitar CORS para as origens configuradas
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Authorization']
  });
  
  // Habilitar validação global
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // Configurar prefixo global para todas as rotas (DEPOIS do CORS)
  app.setGlobalPrefix('api');

  // Configuração do Swagger
  const config = new DocumentBuilder()
    .setTitle('WorkChoque API')
    .setDescription('API para o sistema WorkChoque - Gestão de Planos de Ação')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });
  
  await app.listen(process.env.PORT ?? 3000);
  console.log(`📚 Documentação da API disponível em: http://localhost:${process.env.PORT ?? 3000}/api/docs`);
  console.log(`🚀 Servidor rodando na porta ${process.env.PORT ?? 3000}`);
  console.log(`📡 Rotas disponíveis em: http://localhost:${process.env.PORT ?? 3000}/api`);
}
bootstrap();
