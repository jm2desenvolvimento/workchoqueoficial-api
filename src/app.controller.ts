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
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  getHealth(): {
    status: string;
    message: string;
    timestamp: string;
    uptime: number;
    environment: string;
  } {
    return {
      status: 'ok',
      message: 'Servidor está online e saudável',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
