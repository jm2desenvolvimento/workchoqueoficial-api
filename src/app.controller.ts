import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test')
  getTest(): { status: string; message: string; timestamp: string } {
    return {
      status: 'success',
      message: 'API está online e funcionando corretamente!',
      timestamp: new Date().toISOString()
    };
  }
}
