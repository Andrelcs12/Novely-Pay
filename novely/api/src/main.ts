import { NestFactory, Reflector } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: !isProd,
    }),
  );

  // 🔍 Debug (remove depois)
  console.log('DATABASE_URL:', process.env.DATABASE_URL);

  // ✅ Validação global (ESSENCIAL)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove campos não definidos no DTO
      forbidNonWhitelisted: true, // erro se enviar campo extra
      transform: true, // converte tipos automaticamente
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ✅ Serialização global (entities)
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  // ✅ CORS (ajusta depois pro seu frontend)
  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
  });

  const port = process.env.PORT || 4000;

  // 🔥 importante pra docker / produção
  await app.listen(port, '0.0.0.0');

  console.log(`
🚀 API rodando
🌍 Mode: ${isProd ? 'production' : 'development'}
🔗 http://localhost:${port}
`);
}

bootstrap();