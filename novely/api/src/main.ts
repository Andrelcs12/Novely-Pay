
import { NestFactory, Reflector } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );

  // O "Filtro de impurezas" global
  app.useGlobalPipes(new ValidationPipe ({
    whitelist: true, // Remove qualquer campo que não esteja no DTO (Segurança!)
    forbidNonWhitelisted: true, // Dá erro se tentarem enviar campos estranhos
    transform: true, // Converte tipos automaticamente (ex: string pra number)
  }))

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)))


  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
