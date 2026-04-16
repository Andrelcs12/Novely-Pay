
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class SaasApiKeyGuard implements CanActivate {
    constructor(private prisma: PrismaService) {}

   // common/guards/saas.guard.ts

async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
        throw new UnauthorizedException("API Key ausente");
    }

    // --- NOVO: Verificação da Master Key ---
    if (apiKey === process.env.ADMIN_MASTER_KEY) {
        request['saas'] = { name: 'ADMIN', isAdmin: true }; // Injeta um admin fake
        return true;
    }
    // ---------------------------------------

    const hash = createHash('sha256').update(apiKey).digest('hex');
    const saas = await this.prisma.saas.findUnique({
        where: { apiKeyHash: hash }
    });

    if (!saas || !saas.isActive) {
        throw new UnauthorizedException('API Key inválida ou SaaS desativado.');
    }

    request['saas'] = saas;
    return true;
}
}