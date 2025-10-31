import { Module, forwardRef } from '@nestjs/common';
import { ActionPlansService } from './action-plans.service';
import { ActionPlansController } from './action-plans.controller';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionnairesModule } from '../questionnaires/questionnaires.module';

@Module({
  imports: [
    forwardRef(() => QuestionnairesModule),
  ],
  controllers: [ActionPlansController],
  providers: [ActionPlansService, PrismaService],
  exports: [ActionPlansService]
})
export class ActionPlansModule {}
