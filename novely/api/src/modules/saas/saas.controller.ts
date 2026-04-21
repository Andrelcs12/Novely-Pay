import { ClassSerializerInterceptor, Controller, UseInterceptors } from '@nestjs/common';
import { SaasService } from './saas.service';

@Controller('saas')
@UseInterceptors(ClassSerializerInterceptor)
export class SaasController {
  constructor(private readonly saasService: SaasService) {}


}
