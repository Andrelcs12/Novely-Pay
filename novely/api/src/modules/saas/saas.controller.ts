import { Body, ClassSerializerInterceptor, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { SaasService } from './saas.service';
import { SaasApiKeyGuard } from '../../common/guards/saas.guard';
import { CreateSaasDto, UpdateSaasDto } from './dto/saas.dto';
import { SaasEntity } from './entities/saas.entity';

@Controller('saas')
@UseInterceptors(ClassSerializerInterceptor)
export class SaasController {
  constructor(private readonly saasService: SaasService) {}

  /**
   * 1. Criar novo SaaS (Ex: Novely Arenas)
   * ACESSO: Apenas você (Admin) com a chave mestra.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createSaasDto: CreateSaasDto) {
    const result = await this.saasService.registerNewSaas(createSaasDto);
    
    return {
      message: 'SaaS registrado com sucesso! Guarde sua chave com segurança.',
      // Envolvemos o dado na Entity para esconder o Hash, 
      // mas retornamos a apiKey pura aqui pela ÚNICA vez.
      data: new SaasEntity(result),
      apiKey: result.apiKey, 
    };
  }

  /**
   * 2. O próprio SaaS consulta seus dados e métricas (Ex: O Arenas quer ver o lucro dele)
   * ACESSO: API Key do próprio SaaS.
   */
  /*
  @Get('me/balance')
  @UseGuards(SaasApiKeyGuard)
  async getMyBalance(@Req() req: any) {
    // O SaasApiKeyGuard injeta o saas dentro da request automaticamente
    const saas = req.saas; 
    const metrics = await this.saasService.getSaasMetrics(saas.id);
    
    return {
      saas: new SaasEntity(saas),
      metrics
    };
  }
 */
  /**
   * 3. Detalhes de um SaaS específico pelo ID
   * ACESSO: Apenas Admin.
   */
  @Get(':id')
  @UseGuards(SaasApiKeyGuard)
  async findOne(@Param('id') id: string) {
    const saas = await this.saasService.findOne(id);
    return new SaasEntity(saas);
  }

  /**
   * 4. Atualizar dados de um SaaS (Ex: Mudar comissão ou desativar)
   * ACESSO: Apenas Admin.
   */
  @Patch(':id')
  @UseGuards(SaasApiKeyGuard)
  async update(@Param('id') id: string, @Body() updateSaasDto: UpdateSaasDto) {
    const updatedSaas = await this.saasService.update(id, updateSaasDto);
    return new SaasEntity(updatedSaas);
  }
}
