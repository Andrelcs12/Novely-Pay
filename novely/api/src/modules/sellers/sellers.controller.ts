// src/modules/sellers/sellers.controller.ts

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  BadRequestException
} from '@nestjs/common';
import { SellersService } from './sellers.service';
import { CreateSellerDto, CreateBankAccountDto, SendKycDocumentDto } from './dto/seller.dto';
import { SaasApiKeyGuard } from '../../common/guards/saas.guard';

interface AuthRequest extends Request {
  auth: {
    type: 'ADMIN' | 'SAAS';
    saas: { id: string } | null;
    isAdmin: boolean;
  };
}

@Controller('sellers')
@UseGuards(SaasApiKeyGuard)
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  // ─────────────────────────────────────────────────────────────
  // POST /sellers
  // Cria seller + subaccount Asaas
  // ─────────────────────────────────────────────────────────────
  @Post()
  async create(@Body() dto: CreateSellerDto, @Req() req: AuthRequest) {
    const saasId = this.getSaasId(req, dto as any);
    return this.sellersService.create(saasId, dto);
  }

  // ─────────────────────────────────────────────────────────────
  // GET /sellers
  // Lista todos os sellers do SaaS autenticado
  // ─────────────────────────────────────────────────────────────
  @Get()
  async findAll(@Req() req: AuthRequest) {
    const saasId = this.getSaasId(req);
    return this.sellersService.findAll(saasId);
  }

  // ─────────────────────────────────────────────────────────────
  // GET /sellers/:id
  // ─────────────────────────────────────────────────────────────
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: AuthRequest) {
    const saasId = this.getSaasId(req);
    return this.sellersService.findOne(saasId, id);
  }

  // ─────────────────────────────────────────────────────────────
  // POST /sellers/:id/bank-account
  // Cadastra conta bancária na subaccount do seller
  // Obrigatório antes do primeiro saque
  // ─────────────────────────────────────────────────────────────
  @Post(':id/bank-account')
  async createBankAccount(
    @Param('id') id: string,
    @Body() dto: CreateBankAccountDto
  ) {
    return this.sellersService.createBankAccount(id, dto);
  }

  // ─────────────────────────────────────────────────────────────
  // POST /sellers/:id/kyc-documents
  // Envia documento para análise KYC no Asaas
  // Tipos: IDENTIFICATION, SELFIE, RESIDENCE_PROOF, etc.
  // ─────────────────────────────────────────────────────────────
  @Post(':id/kyc-documents')
  async sendKycDocument(
    @Param('id') id: string,
    @Body() dto: SendKycDocumentDto
  ) {
    return this.sellersService.sendKycDocument(id, dto);
  }

  // ─────────────────────────────────────────────────────────────
  // GET /sellers/:id/kyc-status
  // Consulta status de aprovação KYC no Asaas
  // ─────────────────────────────────────────────────────────────
  @Get(':id/kyc-status')
  async getKycStatus(@Param('id') id: string) {
    return this.sellersService.getKycStatus(id);
  }

  // ─────────────────────────────────────────────────────────────
  // Helper: extrai saasId do token (ou do body se admin)
  // ─────────────────────────────────────────────────────────────
  private getSaasId(req: AuthRequest, body?: Record<string, string>): string {
    if (req.auth.isAdmin) {
      const id = body?.['saasId'] ?? req.auth.saas?.id;
      if (!id) throw new BadRequestException('saasId obrigatório para admin');
      return id;
    }

    const id = req.auth.saas?.id;
    if (!id) throw new BadRequestException('saasId não identificado no token');
    return id;
  }
}