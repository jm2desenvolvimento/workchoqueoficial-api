import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PermissionsModule } from './permissions/permissions.module';
import { QuestionnairesModule } from './questionnaires/questionnaires.module';
import { DiagnosticsModule } from './diagnostics/diagnostics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AiController } from './IAs/ai.controller';
import { PrismaService } from './prisma/prisma.service';
import { ActivityTrackingMiddleware } from './auth/middleware/activity-tracking.middleware';
import { ActionPlansModule } from './action-plans/action-plans.module';
import { CategoriesModule } from './categories/categories.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    PermissionsModule,
    QuestionnairesModule,
    DiagnosticsModule,
    NotificationsModule,
    ActionPlansModule,
    CategoriesModule,
  ],
  controllers: [AppController, AiController],
  providers: [AppService, PrismaService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ActivityTrackingMiddleware)
      .exclude('/api/auth/login', '/api/auth/register', '/health', '/favicon.ico', '/', '/robots.txt', '/sitemap.xml')
      .forRoutes('*'); // Apply to all routes except auth routes
  }
}
