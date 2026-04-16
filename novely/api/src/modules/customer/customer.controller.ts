import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { SaasApiKeyGuard } from '../../common/guards/saas.guard';
import { CreateSellerCustomerDto } from './dto/customer.dto';

@Controller('sellers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post('onboarding/customer')
  @UseGuards(SaasApiKeyGuard) // Somente o SaaS (Arena) chama isso
  async register(@Body() dto: CreateSellerCustomerDto, @Req() req: any) {
    // Pegamos o ID do SaaS que o Guard injetou na request
    const saasId = req.saas.id;
    return this.customerService.createCustomer(dto, saasId);
  }

  
}
