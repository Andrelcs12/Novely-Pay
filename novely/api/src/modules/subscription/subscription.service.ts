import { 
  Injectable, 
  NotFoundException, 
  InternalServerErrorException, 
  BadRequestException, 
  Logger 
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import axios from 'axios';
import { CreateSubscriptionDto } from './dto/subscription.dto';
import { SubscriptionStatus } from '../../generated/prisma/enums';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly asaasUrl = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';

  constructor(private prisma: PrismaService) {}

  async criarAssinatura(dto: CreateSubscriptionDto) {
    // 1. Validação de existência do Seller e duplicidade
    const seller = await this.prisma.seller.findUnique({
      where: { id: dto.sellerId },
      include: { subscriptions: true }
    });

    if (!seller || !seller.asaasCustomerId) {
      throw new NotFoundException('Seller não encontrado ou sem vínculo com o Asaas.');
    }

    const assinaturaAtiva = seller.subscriptions.find(s => 
      ['ACTIVE', 'PENDING'].includes(s.status)
    );
    
    if (assinaturaAtiva) {
      throw new BadRequestException('Este vendedor já possui uma assinatura ativa ou pendente.');
    }

    try {
      // 2. Chamada ao Provedor
      const { data } = await axios.post(
        `${this.asaasUrl}/subscriptions`,
        {
          customer: seller.asaasCustomerId,
          billingType: dto.billingType,
          value: dto.value,
          nextDueDate: dto.nextDueDate,
          cycle: dto.cycle,
          description: dto.description,
          externalReference: seller.id,
        },
        { headers: { access_token: process.env.ASAAS_API_KEY } }
      );

      // 3. Persistência com tratamento de fuso e checkoutUrl
      return await this.prisma.subscription.create({
        data: {
          asaasId: data.id,
          sellerId: seller.id,
          value: dto.value,
          cycle: dto.cycle,
          billingType: dto.billingType,
          description: dto.description,
          // Garante que a data não retroceda devido ao fuso horário
          nextDueDate: new Date(`${dto.nextDueDate}T12:00:00Z`), 
          status: 'PENDING',
          checkoutUrl: data.invoiceUrl || null, 
        },
      });

    } catch (error: any) {
      this.tratarErroProvedor(error, dto.sellerId);
    }
  }

  async buscarHistoricoDeCobrancas(id: string) {
    const assinatura = await this.validarAssinaturaLocal(id);

    try {
      const { data } = await axios.get(
        `${this.asaasUrl}/subscriptions/${assinatura.asaasId}/payments`,
        { headers: { access_token: process.env.ASAAS_API_KEY } }
      );
      return data;
    } catch (error: any) {
      this.tratarErroProvedor(error, id);
    }
  }

  async cancelarContrato(id: string) {
    const assinatura = await this.validarAssinaturaLocal(id);

    if (assinatura.status === 'CANCELLED') {
       throw new BadRequestException('Esta assinatura já se encontra cancelada.');
    }

    try {
      await axios.delete(
        `${this.asaasUrl}/subscriptions/${assinatura.asaasId}`,
        { headers: { access_token: process.env.ASAAS_API_KEY } }
      );

      return await this.prisma.subscription.update({
        where: { id },
        data: { 
          status: 'CANCELLED' as SubscriptionStatus, 
          endDate: new Date() 
        }
      });
    } catch (error: any) {
      this.tratarErroProvedor(error, id);
    }
  }

  async consultarStatusAtualizado(id: string) {
    const assinatura = await this.validarAssinaturaLocal(id);

    try {
      const { data } = await axios.get(
        `${this.asaasUrl}/subscriptions/${assinatura.asaasId}`,
        { headers: { access_token: process.env.ASAAS_API_KEY } }
      );
      
      // Mapeamento de status: Asaas -> Novely Pay
      const statusMap: Record<string, SubscriptionStatus> = {
        'ACTIVE': 'ACTIVE',
        'INACTIVE': 'CANCELLED',
        'EXPIRED': 'EXPIRED',
        'OVERDUE': 'OVERDUE'
      };

      const novoStatus = statusMap[data.status] || 'PENDING';
      
      if (novoStatus !== assinatura.status) {
        await this.prisma.subscription.update({
          where: { id },
          data: { status: novoStatus }
        });
      }

      return { dadosLocais: assinatura, dadosProvedor: data };
    } catch (error: any) {
      this.tratarErroProvedor(error, id);
    }
  }

  // --- MÉTODOS PRIVADOS DE SUPORTE ---

  private async validarAssinaturaLocal(id: string) {
    const assinatura = await this.prisma.subscription.findUnique({ where: { id } });
    if (!assinatura) throw new NotFoundException('Assinatura não encontrada no banco de dados.');
    return assinatura;
  }

  private tratarErroProvedor(error: any, contextId?: string) {
    const errosAsaas = error.response?.data?.errors;
    
    // Log detalhado para o desenvolvedor
    this.logger.error(`[ERRO FINANCEIRO] ID: ${contextId} | Detalhes: ${JSON.stringify(errosAsaas || error.message)}`);

    if (errosAsaas) {
      const msg = errosAsaas.map((e: any) => e.description).join(', ');
      throw new BadRequestException(`Asaas: ${msg}`);
    }

    // Erro de conexão ou timeout
    if (error.request) {
      throw new InternalServerErrorException('O servidor do Asaas não respondeu. Tente novamente em instantes.');
    }

    throw new InternalServerErrorException('Erro interno ao processar operação financeira.');
  }
}