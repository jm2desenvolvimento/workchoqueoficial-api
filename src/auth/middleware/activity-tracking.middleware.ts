import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit.service';

// Extend Request interface to include user and startTime
interface AuthenticatedRequest extends Request {
  user?: any;
  startTime?: number;
}

@Injectable()
export class ActivityTrackingMiddleware implements NestMiddleware {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    // Skip tracking for certain routes
    const skipRoutes = [
      '/api/auth/login',
      '/api/auth/logout',
      '/api/auth/profile',
      '/health',
      '/favicon.ico',
      '/',
      '/robots.txt',
      '/sitemap.xml',
    ];

    if (skipRoutes.some((route) => req.path.includes(route))) {
      return next();
    }

    // Only track authenticated requests
    if (!req.user) {
      // Only log for API routes to avoid spam
      if (req.path.startsWith('/api/')) {
        console.log(`Middleware: No user found for route ${req.path}`);
      }
      return next();
    }

    console.log(
      `Middleware: Tracking activity for user ${req.user.sub || req.user.id} on route ${req.path}`,
    );

    const user = req.user;

    // Determine action based on HTTP method and path
    const action = this.getActionFromRequest(req);
    const { entityType, entityId } = this.getEntityFromRequest(req);

    // Log the activity after the response is sent
    res.on('finish', async () => {
      try {
        // Only log successful requests (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const userId = user.sub || user.id;
          const ip =
            req.ip ||
            req.connection?.remoteAddress ||
            (req.headers['x-forwarded-for'] as string);

          console.log(
            `Middleware: Logging activity for user ${userId}, action: ${action}`,
          );
          await this.logActivity(
            userId,
            action,
            entityType,
            entityId,
            {
              method: req.method,
              path: req.path,
              status_code: res.statusCode,
              response_time: Date.now() - (req.startTime || Date.now()),
            },
            {
              ip,
              userAgent: req.headers['user-agent'],
            },
          );
          console.log(
            `Middleware: Activity logged successfully for user ${userId}`,
          );

          // Verificações de segurança automáticas
          await this.auditService.checkOffHoursActivity(userId, action);
          await this.auditService.checkCriticalAction(
            userId,
            action,
            entityType || undefined,
          );
        }
      } catch (error) {
        console.error('Error logging activity:', error);
      }
    });

    // Add start time for response time calculation
    req.startTime = Date.now();

    next();
  }

  private getActionFromRequest(req: AuthenticatedRequest): string {
    const method = req.method.toLowerCase();
    const path = req.path;

    // Map common patterns to actions
    if (path.includes('/questionnaires')) {
      switch (method) {
        case 'post':
          return 'create_questionnaire';
        case 'put':
        case 'patch':
          return 'update_questionnaire';
        case 'delete':
          return 'delete_questionnaire';
        case 'get':
          return 'view_questionnaire';
        default:
          return 'questionnaire_action';
      }
    }

    if (path.includes('/diagnostics')) {
      switch (method) {
        case 'post':
          return 'create_diagnostic';
        case 'put':
        case 'patch':
          return 'update_diagnostic';
        case 'delete':
          return 'delete_diagnostic';
        case 'get':
          return 'view_diagnostic';
        default:
          return 'diagnostic_action';
      }
    }

    if (path.includes('/users')) {
      switch (method) {
        case 'post':
          return 'create_user';
        case 'put':
        case 'patch':
          return 'update_user';
        case 'delete':
          return 'delete_user';
        case 'get':
          return 'view_user';
        default:
          return 'user_action';
      }
    }

    if (path.includes('/reports')) {
      return 'view_report';
    }

    if (path.includes('/permissions')) {
      switch (method) {
        case 'post':
          return 'create_permission';
        case 'put':
        case 'patch':
          return 'update_permission';
        case 'delete':
          return 'delete_permission';
        case 'get':
          return 'view_permission';
        default:
          return 'permission_action';
      }
    }

    // Generic action based on method
    switch (method) {
      case 'post':
        return 'create';
      case 'put':
      case 'patch':
        return 'update';
      case 'delete':
        return 'delete';
      case 'get':
        return 'view';
      default:
        return 'unknown_action';
    }
  }

  private getEntityFromRequest(req: AuthenticatedRequest): {
    entityType: string | null;
    entityId: string | null;
  } {
    const path = req.path;

    // Extract entity type and ID from path
    const pathSegments = path.split('/').filter((segment) => segment);

    if (pathSegments.length >= 3) {
      const entityType = pathSegments[pathSegments.length - 2];
      const entityId = pathSegments[pathSegments.length - 1];

      // Check if the last segment is actually an ID (not an action)
      if (this.isValidId(entityId) && !this.isActionSegment(entityId)) {
        return { entityType, entityId };
      }
    }

    if (pathSegments.length >= 2) {
      const entityType = pathSegments[pathSegments.length - 1];
      if (this.isEntityType(entityType)) {
        return { entityType, entityId: null };
      }
    }

    return { entityType: null, entityId: null };
  }

  private isValidId(segment: string): boolean {
    // Check if segment looks like a valid ID (CUID, UUID, or numeric)
    return (
      /^[a-zA-Z0-9_-]{20,}$/.test(segment) || // CUID-like
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        segment,
      ) || // UUID
      /^\d+$/.test(segment)
    ); // Numeric ID
  }

  private isActionSegment(segment: string): boolean {
    const actionSegments = [
      'stats',
      'export',
      'download',
      'activate',
      'deactivate',
      'reset',
    ];
    return actionSegments.includes(segment.toLowerCase());
  }

  private isEntityType(segment: string): boolean {
    const entityTypes = [
      'users',
      'questionnaires',
      'diagnostics',
      'reports',
      'permissions',
      'companies',
      'subscriptions',
      'notifications',
    ];
    return entityTypes.includes(segment.toLowerCase());
  }

  private async logActivity(
    userId: string,
    action: string,
    entityType: string | null,
    entityId: string | null,
    details: any,
    requestInfo: { ip?: string; userAgent?: string },
  ) {
    try {
      console.log(
        `Middleware: Creating activity log for user ${userId}, action: ${action}`,
      );
      const result = await this.prisma.user_activity_log.create({
        data: {
          user_id: userId,
          action,
          entity_type: entityType,
          entity_id: entityId,
          details: details ? JSON.stringify(details) : undefined,
          ip_address: requestInfo.ip,
          user_agent: requestInfo.userAgent,
        },
      });
      console.log(`Middleware: Activity log created with ID: ${result.id}`);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }
}
