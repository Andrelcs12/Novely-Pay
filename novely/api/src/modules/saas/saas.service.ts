import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateSaasDto, UpdateSaasDto } from './dto/saas.dto';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class SaasService {

    constructor(private prisma: PrismaService) {}

    /**
   * Registra um novo ecossistema SaaS (ex: Novely Arenas)
   * Apenas chamado por você (Admin)
   */

    async registerNewSaas(dto: CreateSaasDto) {
        const slugExists = await this.prisma.saas.findUnique({
            where: {slug: dto.slug}
        });

        if (slugExists) {
        throw new ConflictException('Este slug já está sendo utilizado.');
        }

        // 2. Geração da API Key Única (Pura)
        const rawApiKey = `novelypay_${randomBytes(32).toString('hex')}`;

        // 3. Geração do Hash (Segurança para o banco)
        const apiKeyHash = createHash('sha256').update(rawApiKey).digest('hex');

        try {
            const newSaas = await this.prisma.saas.create({
                data: {
                    name: dto.name,
                    slug: dto.slug,
                    comissao: dto.comissao,
                    apiKeyHash: apiKeyHash,
                    // Vincula à sua carteira master do Asaas (definida no .env)
                    asaasId: process.env.ASAAS_MASTER_WALLET_ID!,

                }
            });

            // Retornamos o objeto com a chave pura (rawApiKey) 
            // para que o controller exiba APENAS nesta criação.
            return {
                ...newSaas,
                apiKey: rawApiKey
            };


        } catch (error) {
            console.error('Erro ao criar SaaS no banco:', error);
            throw new InternalServerErrorException('Falha ao registrar novo parceiro SaaS.');
            }
        }

    /**
     * Busca um SaaS específico pelo ID
     */
    async findOne(id: string) {
        const saas = await this.prisma.saas.findUnique({
        where: { id },
        });

        if (!saas) {
        throw new NotFoundException('SaaS não encontrado.');
        }

        return saas;
    }


    /**
     * Método essencial para o SaasApiKeyGuard
     * Busca por hash para validar as requisições que vêm dos seus sistemas
     */
    async findByHash(hash: string) {
        return this.prisma.saas.findUnique({
        where: { 
            apiKeyHash: hash,
            isActive: true // Só valida se o SaaS não estiver banido/suspenso
        },
        });
    }

    /**
     * Atualiza dados de comissão ou status do SaaS
     */
    async update(id: string, dto: UpdateSaasDto) {
        // Verifica se existe antes de tentar atualizar
        await this.findOne(id);

        return this.prisma.saas.update({
        where: { id },
        data: dto,
        });
    }

    /**
     * Gera métricas financeiras simplificadas para o SaaS logado
     */
    /*
    async getSaasMetrics(saasId: string) {
        // Aqui no futuro faremos queries na tabela de transações
        // Por enquanto, contamos quantos vendedores (clientes) o SaaS trouxe
        const sellersCount = await this.prisma.user.count({
        where: { saasId },
        });

        return {
        saasId,
        activeSellers: sellersCount,
        totalProcessed: 0, // Mock para implementação futura
        commissionRate: 'Consulte seu contrato',
        status: 'Operacional'
        };
    }

    */
}
