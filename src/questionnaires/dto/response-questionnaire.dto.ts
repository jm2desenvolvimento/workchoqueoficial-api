import { IsObject, IsOptional, IsString } from 'class-validator';

export class ResponseQuestionnaireDto {
  @IsOptional()
  @IsString()
  questionnaire_id?: string; // Opcional, pois já vem na URL

  @IsObject()
  responses: Record<string, string>; // { question_id: answer }
}
