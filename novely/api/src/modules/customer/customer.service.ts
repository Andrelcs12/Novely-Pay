import { BadRequestException, ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateSellerCustomerDto } from './dto/customer.dto';
import axios from 'axios'
@Injectable()
export class CustomerService {

    private readonly asaasUrl = 'https://api-sandbox.asaas.com/v3';

    constructor(private prisma: PrismaService) {}

    async createCustomer(dto: CreateSellerCustomerDto, saasId: string) {
        // 1. Verificar se o CPF/CNPJ já existe no seu banco
        const existing = await this.prisma.seller.findUnique({
            where: {
                cpfCnpj: dto.cpfCnpj
            }
        })

        if (existing) throw new ConflictException('Este CPF/CNPJ já está cadastrado.');

        try {
            
            const response = await axios.post(`${this.asaasUrl}/customers`,
                {
                    name: dto.name,
                    email: dto.email,
                    cpfCnpj: dto.cpfCnpj,
                    mobilePhone: dto.mobilePhone,
                    externalReference: dto.cpfCnpj,
                },
                { headers: {
                    access_token: process.env.ASAAS_API_KEY
                }}
            );

            
            return await this.prisma.seller.create({
                data: {
                    ...dto,
                    saasId,
                    asaasCustomerId: response.data.id
                }
            })
        } 
        // src/modules/customer/customer.service.ts

        catch (error: any) {
            // 1. Log para você ver no terminal do VS Code
            const asaasErrors = error.response?.data?.errors;
            console.error('Erro Asaas:', asaasErrors || error.message);

            // 2. Se o Asaas mandou erro de validação (ex: celular inválido), repassa pro cliente
            if (asaasErrors && asaasErrors.length > 0) {
                const mensagem = asaasErrors.map((e: any) => e.description).join(', ');
                // Lançamos um BadRequest (400) com a mensagem real
                throw new BadRequestException(`Erro no Asaas: ${mensagem}`);
            }

            // 3. Se for outro erro qualquer, mantém o 500
            throw new InternalServerErrorException('Erro inesperado ao integrar com o Asaas.');
        }

            } 
}
