import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContextService } from './context.service';
import { ChatService } from './chat.service';
import { AgentController } from './agent.controller';

@Module({
  controllers: [AgentController],
  providers: [PrismaService, ContextService, ChatService],
  exports: [ContextService],
})
export class ChatbotModule {}
