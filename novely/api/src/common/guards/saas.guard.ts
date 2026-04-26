
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class SaasApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException("API Key ausente");
    }

    // 🔥 ADMIN GLOBAL
    if (apiKey === process.env.ADMIN_MASTER_KEY) {
      request['auth'] = {
        type: 'ADMIN',
        saas: null,
        isAdmin: true
      };

      return true;
    }

    // 🔥 SAAS NORMAL
    const hash = createHash('sha256').update(apiKey).digest('hex');

    const saas = await this.prisma.saas.findUnique({
      where: { apiKeyHash: hash }
    });

    if (!saas || !saas.isActive) {
      throw new UnauthorizedException('API Key inválida ou SaaS desativado.');
    }

    request['auth'] = {
      type: 'SAAS',
      saas,
      isAdmin: false
    };

    return true;
  }
}