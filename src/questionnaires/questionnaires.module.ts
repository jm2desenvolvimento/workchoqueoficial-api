import { Module, forwardRef } from '@nestjs/common';
import { QuestionnairesService } from './questionnaires.service';
import { QuestionnairesController } from './questionnaires.controller';
import { PublicQuestionnairesController } from './public-questionnaires.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ActionPlansModule } from '../action-plans/action-plans.module';

@Module({
  imports: [
    forwardRef(() => ActionPlansModule),
  ],
  controllers: [QuestionnairesController, PublicQuestionnairesController],
  providers: [QuestionnairesService, PrismaService],
  exports: [QuestionnairesService],
})
export class QuestionnairesModule {}
