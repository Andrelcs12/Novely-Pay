
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class SaasApiKeyGuard implements CanActivate {
    constructor(private prisma: PrismaService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();

        // 1. Pega a chave do Header (ex: x-api-key )
        const apiKey = request.headers['x-api-key'];

        if (!apiKey) {
            throw new UnauthorizedException("API Key ausente no cabeçalho x-api-key");
        }
        
        // 2. Gera o Hash da chave recebida para comparar com o banco
        const hash = createHash('sha256').update(apiKey).digest('hex');

        // 3. Busca o SaaS no banco pelo Hash
        const saas = await this.prisma.saas.findUnique({
            where: {apiKeyHash: hash}
        });

        // 4. Se não encontrar o SaaS
        if (!saas) {
        throw new UnauthorizedException('API Key inválida.');
        }

        // 5. Se o SaaS estiver desativado (campo isActive que criamos no model)
        if(!saas.isActive) {
            throw new ForbiddenException("Este SaaS está desativado no Novely Pay.")
        }

        // 6. O PULO DO GATO: Anexa o SaaS na request
        // Agora, dentro do seu Controller, você terá acesso a request.saas
        request['saas'] = saas;

        return true;


    }
}