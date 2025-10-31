import { Controller, Post, Body } from '@nestjs/common';
import { analyzeWithGemini } from './gemini';

@Controller('ai')
export class AiController {
  @Post('analyze')
  async analyze(@Body('text') text: string) {
    if (!text || typeof text !== 'string') {
      return { analysis: 'Texto inválido para análise.' };
    }
    try {
      const analysis = await analyzeWithGemini(text);
      return { analysis };
    } catch (error: any) {
      return { analysis: `Erro ao analisar: ${error.message}` };
    }
  }
}
