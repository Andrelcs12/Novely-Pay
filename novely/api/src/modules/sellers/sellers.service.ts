// src/modules/sellers/sellers.service.ts

import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { PrismaService } from '../../prisma.service';
import { CreateSellerDto, CreateBankAccountDto, SendKycDocumentDto } from './dto/seller.dto';
import { extractAsaasError } from '../../common/guards/helpers/asaaar-error.helper';

@Injectable()
export class SellersService {
  private readonly logger = new Logger(SellersService.name);
  private readonly http: AxiosInstance;

  constructor(private prisma: PrismaService) {
    this.http = axios.create({
      baseURL: process.env.ASAAS_API_URL || 'https://api-sandbox.asaas.com/v3',
      headers: {
        'Content-Type': 'application/json',
        access_token: process.env.ASAAS_API_KEY
      },
      timeout: 20000
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 1. Cria seller no banco + subaccount no Asaas
  //    A subaccount recebe um walletId próprio para splits
  // ─────────────────────────────────────────────────────────────
  async create(saasId: string, dto: CreateSellerDto) {
    // Garante que o SaaS existe
    const saas = await this.prisma.saas.findUnique({ where: { id: saasId } });
    if (!saas) throw new BadRequestException('SaaS não encontrado');

    // Verifica duplicidade local antes de chamar o Asaas
    const existente = await this.prisma.seller.findFirst({
      where: { email: dto.email }
    });
    if (existente) throw new BadRequestException('Seller já cadastrado com este e-mail');

    // ── Cria subaccount no Asaas ──────────────────────────────
    let asaasAccount: {
      id: string;
      walletId: string;
      apiKey: string;
    };

    try {
      const { data } = await this.http.post('/accounts', {
        name: dto.name,
        email: dto.email,
        cpfCnpj: dto.cpfCnpj,
        mobilePhone: dto.mobilePhone,
        companyType: dto.companyType ?? undefined,
        address: dto.address ?? undefined,
        addressNumber: dto.addressNumber ?? undefined,
        complement: dto.complement ?? undefined,
        province: dto.province ?? undefined,
        postalCode: dto.postalCode ?? undefined,
        city: dto.city ?? undefined,
        state: dto.state ?? undefined
      });

      asaasAccount = {
        id: data.id,
        walletId: data.walletId,
        apiKey: data.apiKey
      };

      this.logger.log(`Subaccount criada no Asaas: ${asaasAccount.id} | seller: ${dto.email}`);
    } catch (err) {
      const msg = extractAsaasError(err);
      this.logger.error(`Erro ao criar subaccount no Asaas: ${msg}`);
      throw new BadRequestException(`Asaas: ${msg}`);
    }

    // ── Persiste seller no banco ──────────────────────────────
    const seller = await this.prisma.seller.create({
      data: {
        name: dto.name,
        email: dto.email,
        cpfCnpj: dto.cpfCnpj,
        mobilePhone: dto.mobilePhone,
        saasId,
        asaasWalletId: asaasAccount.walletId,
        asaasApiKey: asaasAccount.apiKey     // guarda a key da subaccount (usada para KYC)
      }
    });

    return {
      seller,
      asaas: {
        accountId: asaasAccount.id,
        walletId: asaasAccount.walletId
      }
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Cadastra conta bancária na subaccount do seller
  //    Sem isso o saque (cashout) não funciona
  // ─────────────────────────────────────────────────────────────
  async createBankAccount(sellerId: string, dto: CreateBankAccountDto) {
    const seller = await this.prisma.seller.findUnique({ where: { id: sellerId } });
    if (!seller) throw new NotFoundException('Seller não encontrado');
    if (!seller.asaasApiKey) throw new BadRequestException('Seller sem API key da subaccount');

    // Conta bancária é cadastrada usando a API key da SUBACCOUNT (não da master)
    const subHttp = this.buildSubHttp(seller.asaasApiKey);

    try {
      const { data } = await subHttp.post('/myAccount/bankAccount', {
        bank: { code: dto.bank },
        accountName: dto.accountName,
        ownerName: dto.ownerName,
        cpfCnpj: dto.cpfCnpj,
        agency: dto.agency,
        agencyDigit: dto.agencyDigit ?? undefined,
        account: dto.account,
        accountDigit: dto.accountDigit,
        bankAccountType: dto.bankAccountType
      });

      this.logger.log(`Conta bancária cadastrada | seller: ${sellerId}`);
      return { ok: true, bankAccount: data };
    } catch (err) {
      const msg = extractAsaasError(err);
      this.logger.error(`Erro ao cadastrar conta bancária: ${msg}`);
      throw new BadRequestException(`Asaas: ${msg}`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Envia documento KYC para o Asaas
  //    Tipos: IDENTIFICATION, SELFIE, RESIDENCE_PROOF, etc.
  // ─────────────────────────────────────────────────────────────
  async sendKycDocument(sellerId: string, dto: SendKycDocumentDto) {
    const seller = await this.prisma.seller.findUnique({ where: { id: sellerId } });
    if (!seller) throw new NotFoundException('Seller não encontrado');
    if (!seller.asaasApiKey) throw new BadRequestException('Seller sem API key da subaccount');

    // Documentos são enviados usando a API key da SUBACCOUNT
    const subHttp = this.buildSubHttp(seller.asaasApiKey);

    try {
      const { data } = await subHttp.post('/myAccount/documents', {
        type: dto.type,
        documentFile: dto.documentFile,
        documentFileExtension: dto.documentFileExtension
      });

      this.logger.log(`Documento KYC enviado | seller: ${sellerId} | tipo: ${dto.type}`);
      return { ok: true, document: data };
    } catch (err) {
      const msg = extractAsaasError(err);
      this.logger.error(`Erro ao enviar documento KYC: ${msg}`);
      throw new BadRequestException(`Asaas: ${msg}`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Consulta status KYC do seller no Asaas
  // ─────────────────────────────────────────────────────────────
  async getKycStatus(sellerId: string) {
    const seller = await this.prisma.seller.findUnique({ where: { id: sellerId } });
    if (!seller) throw new NotFoundException('Seller não encontrado');
    if (!seller.asaasApiKey) throw new BadRequestException('Seller sem API key da subaccount');

    const subHttp = this.buildSubHttp(seller.asaasApiKey);

    try {
      const { data } = await subHttp.get('/myAccount');

      return {
        sellerId,
        generalApproval: data?.accountStatus?.generalApproval ?? 'UNKNOWN',
        bankAccountApproval: data?.accountStatus?.bankAccountApproval ?? 'UNKNOWN',
        documentApproval: data?.accountStatus?.documentApproval ?? 'UNKNOWN',
        commercialInfoApproval: data?.accountStatus?.commercialInfoApproval ?? 'UNKNOWN'
      };
    } catch (err) {
      const msg = extractAsaasError(err);
      throw new BadRequestException(`Asaas: ${msg}`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 5. Lista sellers do SaaS
  // ─────────────────────────────────────────────────────────────
  async findAll(saasId: string) {
    return this.prisma.seller.findMany({
      where: { saasId },
      select: {
        id: true,
        name: true,
        email: true,
        cpfCnpj: true,
        mobilePhone: true,
        asaasWalletId: true,
        createdAt: true
        // asaasApiKey NUNCA exposta na listagem
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 6. Busca seller por ID
  // ─────────────────────────────────────────────────────────────
  async findOne(saasId: string, sellerId: string) {
    const seller = await this.prisma.seller.findFirst({
      where: { id: sellerId, saasId },
      select: {
        id: true,
        name: true,
        email: true,
        cpfCnpj: true,
        mobilePhone: true,
        asaasWalletId: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!seller) throw new NotFoundException('Seller não encontrado');
    return seller;
  }

  // ─────────────────────────────────────────────────────────────
  // Helper: cria instância axios com API key da subaccount
  // ─────────────────────────────────────────────────────────────
  private buildSubHttp(apiKey: string): AxiosInstance {
    return axios.create({
      baseURL: process.env.ASAAS_API_URL || 'https://api-sandbox.asaas.com/v3',
      headers: {
        'Content-Type': 'application/json',
        access_token: apiKey
      },
      timeout: 20000
    });
  }
}