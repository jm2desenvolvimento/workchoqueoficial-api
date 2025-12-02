import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface SecurityAlert {
  id: string;
  type:
    | 'multiple_failed_logins'
    | 'suspicious_ip'
    | 'off_hours_activity'
    | 'critical_action'
    | 'access_denied_attempts';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  status: 'new' | 'investigating' | 'resolved';
  createdAt: Date;
}

export interface AuditStats {
  totalActivities24h: number;
  suspiciousLogins: number;
  criticalAlerts: number;
  complianceRate: number;
  activityTimeline: { time: string; activities: number }[];
  loginAttempts: { time: string; successful: number; failed: number }[];
  topActiveUsers: { userId: string; userName: string; activityCount: number }[];
  actionDistribution: { action: string; count: number }[];
}

@Injectable()
export class AuditService {
  private securityAlerts: SecurityAlert[] = [];
  private suspiciousIPs = new Set<string>();
  private failedLoginAttempts = new Map<
    string,
    { count: number; lastAttempt: Date }
  >();

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {}

  // ==================== ESTATÍSTICAS DE AUDITORIA ====================

  async getAuditStats(
    period: '24h' | '7d' | '30d' = '24h',
  ): Promise<AuditStats> {
    const now = new Date();
    const periodMs =
      period === '24h'
        ? 24 * 60 * 60 * 1000
        : period === '7d'
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;
    const startDate = new Date(now.getTime() - periodMs);

    try {
      const [totalActivities, loginStats, topUsers, actionDistribution] =
        await Promise.all([
          // Total de atividades no período
          this.prisma.user_activity_log.count({
            where: {
              created_at: { gte: startDate },
            },
          }),

          // Estatísticas de login
          this.prisma.login_history.findMany({
            where: {
              login_at: { gte: startDate },
            },
            select: {
              login_at: true,
              status: true,
            },
          }),

          // Top usuários ativos
          this.prisma.user_activity_log.groupBy({
            by: ['user_id'],
            where: {
              created_at: { gte: startDate },
            },
            _count: {
              id: true,
            },
            orderBy: {
              _count: {
                id: 'desc',
              },
            },
            take: 10,
          }),

          // Distribuição de ações
          this.prisma.user_activity_log.groupBy({
            by: ['action'],
            where: {
              created_at: { gte: startDate },
            },
            _count: {
              id: true,
            },
            orderBy: {
              _count: {
                id: 'desc',
              },
            },
          }),
        ]);

      // Buscar nomes dos usuários
      const userIds = topUsers.map((u) => u.user_id);
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      });

      const topActiveUsers = topUsers.map((u) => {
        const user = users.find((user) => user.id === u.user_id);
        return {
          userId: u.user_id,
          userName: user?.name || 'Usuário Desconhecido',
          activityCount: u._count.id,
        };
      });

      // Processar timeline de atividades
      const activityTimeline = await this.generateActivityTimeline(
        startDate,
        period,
      );
      const loginTimeline = await this.generateLoginTimeline(
        loginStats,
        period,
      );

      // Contar logins suspeitos e alertas críticos
      const suspiciousLogins = loginStats.filter(
        (l) => l.status === 'failed',
      ).length;
      const criticalAlerts = this.securityAlerts.filter(
        (a) => a.severity === 'critical' && a.status === 'new',
      ).length;

      // Calcular taxa de conformidade (exemplo: 100% - % de ações suspeitas)
      const suspiciousActions = await this.prisma.user_activity_log.count({
        where: {
          created_at: { gte: startDate },
          OR: [
            { action: { contains: 'delete' } },
            { action: { contains: 'admin' } },
          ],
        },
      });
      const complianceRate =
        totalActivities > 0
          ? Math.max(0, 100 - (suspiciousActions / totalActivities) * 100)
          : 100;

      return {
        totalActivities24h: totalActivities,
        suspiciousLogins,
        criticalAlerts,
        complianceRate: Math.round(complianceRate * 100) / 100,
        activityTimeline,
        loginAttempts: loginTimeline,
        topActiveUsers,
        actionDistribution: actionDistribution.map((a) => ({
          action: this.formatActionName(a.action),
          count: a._count.id,
        })),
      };
    } catch (error) {
      console.error('Error getting audit stats:', error);
      return {
        totalActivities24h: 0,
        suspiciousLogins: 0,
        criticalAlerts: 0,
        complianceRate: 100,
        activityTimeline: [],
        loginAttempts: [],
        topActiveUsers: [],
        actionDistribution: [],
      };
    }
  }

  // ==================== LOGS DE AUDITORIA ====================

  async getAuditLogs(
    options: {
      page?: number;
      limit?: number;
      userId?: string;
      action?: string;
      ipAddress?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ) {
    const {
      page = 1,
      limit = 50,
      userId,
      action,
      ipAddress,
      startDate,
      endDate,
    } = options;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (userId) where.user_id = userId;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (ipAddress) where.ip_address = { contains: ipAddress };
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = startDate;
      if (endDate) where.created_at.lte = endDate;
    }

    try {
      const [logs, total] = await Promise.all([
        this.prisma.user_activity_log.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { created_at: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.user_activity_log.count({ where }),
      ]);

      return {
        logs: logs.map((log) => ({
          id: log.id,
          userId: log.user_id,
          userName: log.user.name,
          userEmail: log.user.email,
          userRole: log.user.role,
          action: log.action,
          entityType: log.entity_type,
          entityId: log.entity_id,
          details: log.details,
          ipAddress: log.ip_address,
          userAgent: log.user_agent,
          createdAt: log.created_at,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error getting audit logs:', error);
      return {
        logs: [],
        pagination: { page: 1, limit, total: 0, totalPages: 0 },
      };
    }
  }

  // ==================== HISTÓRICO DE LOGIN ====================

  async getLoginHistory(
    options: {
      page?: number;
      limit?: number;
      userId?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ) {
    const {
      page = 1,
      limit = 50,
      userId,
      status,
      startDate,
      endDate,
    } = options;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (userId) where.user_id = userId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.login_at = {};
      if (startDate) where.login_at.gte = startDate;
      if (endDate) where.login_at.lte = endDate;
    }

    try {
      const [history, total] = await Promise.all([
        this.prisma.login_history.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { login_at: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.login_history.count({ where }),
      ]);

      return {
        history: history.map((h) => ({
          id: h.id,
          userId: h.user_id,
          userName: h.user.name,
          userEmail: h.user.email,
          userRole: h.user.role,
          loginAt: h.login_at,
          logoutAt: h.logout_at,
          ipAddress: h.ip_address,
          userAgent: h.user_agent,
          deviceInfo: h.device_info,
          browserInfo: h.browser_info,
          location: h.location,
          sessionDuration: h.session_duration,
          status: h.status,
          failureReason: h.failure_reason,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error getting login history:', error);
      return {
        history: [],
        pagination: { page: 1, limit, total: 0, totalPages: 0 },
      };
    }
  }

  // ==================== ALERTAS DE SEGURANÇA ====================

  async getSecurityAlerts(status?: 'new' | 'investigating' | 'resolved') {
    let alerts = this.securityAlerts;

    if (status) {
      alerts = alerts.filter((alert) => alert.status === status);
    }

    return alerts.sort((a, b) => {
      // Ordenar por severidade e depois por data
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const aSeverity = severityOrder[a.severity];
      const bSeverity = severityOrder[b.severity];

      if (aSeverity !== bSeverity) {
        return aSeverity - bSeverity;
      }

      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  async updateSecurityAlertStatus(
    alertId: string,
    status: 'new' | 'investigating' | 'resolved',
  ) {
    const alertIndex = this.securityAlerts.findIndex(
      (alert) => alert.id === alertId,
    );
    if (alertIndex !== -1) {
      this.securityAlerts[alertIndex].status = status;
      return this.securityAlerts[alertIndex];
    }
    return null;
  }

  // ==================== SISTEMA DE DETECÇÃO DE ANOMALIAS ====================

  async checkFailedLoginAttempts(email: string, ipAddress: string) {
    const key = `${email}:${ipAddress}`;
    const now = new Date();

    const current = this.failedLoginAttempts.get(key) || {
      count: 0,
      lastAttempt: now,
    };

    // Reset se passou mais de 15 minutos
    if (now.getTime() - current.lastAttempt.getTime() > 15 * 60 * 1000) {
      current.count = 0;
    }

    current.count++;
    current.lastAttempt = now;
    this.failedLoginAttempts.set(key, current);

    // Gerar alerta se mais de 3 tentativas em 15 minutos
    if (current.count >= 3) {
      await this.createSecurityAlert({
        type: 'multiple_failed_logins',
        severity: 'high',
        title: 'Múltiplas Tentativas de Login Falhadas',
        message: `${current.count} tentativas de login falhadas para ${email} do IP ${ipAddress}`,
        ipAddress,
        metadata: { email, attempts: current.count },
      });
    }
  }

  async checkSuspiciousIP(ipAddress: string, userId: string) {
    // Verificar se é um IP novo para este usuário
    const recentLogins = await this.prisma.login_history.findMany({
      where: {
        user_id: userId,
        login_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Últimos 30 dias
        },
      },
      select: { ip_address: true },
    });

    const knownIPs = new Set(
      recentLogins.map((l) => l.ip_address).filter(Boolean),
    );

    if (!knownIPs.has(ipAddress)) {
      await this.createSecurityAlert({
        type: 'suspicious_ip',
        severity: 'medium',
        title: 'Login de IP Desconhecido',
        message: `Login realizado de um novo IP: ${ipAddress}`,
        userId,
        ipAddress,
        metadata: { knownIPs: Array.from(knownIPs) },
      });
    }
  }

  async checkOffHoursActivity(userId: string, action: string) {
    const now = new Date();
    const hour = now.getHours();

    // Considerar atividade suspeita entre 22h e 6h
    if (hour >= 22 || hour <= 6) {
      await this.createSecurityAlert({
        type: 'off_hours_activity',
        severity: 'low',
        title: 'Atividade Fora do Horário',
        message: `Atividade detectada fora do horário comercial: ${action}`,
        userId,
        metadata: { action, hour, timestamp: now.toISOString() },
      });
    }
  }

  async checkCriticalAction(
    userId: string,
    action: string,
    entityType?: string,
  ) {
    const criticalActions = [
      'delete_user',
      'update_user',
      'delete_permission',
      'create_permission',
    ];

    if (criticalActions.includes(action)) {
      await this.createSecurityAlert({
        type: 'critical_action',
        severity: 'critical',
        title: 'Ação Administrativa Crítica',
        message: `Ação crítica executada: ${action} ${entityType ? `em ${entityType}` : ''}`,
        userId,
        metadata: { action, entityType },
      });
    }
  }

  private async createSecurityAlert(
    alertData: Omit<SecurityAlert, 'id' | 'status' | 'createdAt'>,
  ) {
    const alert: SecurityAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...alertData,
      status: 'new',
      createdAt: new Date(),
    };

    this.securityAlerts.push(alert);

    // Criar notificação para admins e masters
    try {
      await this.notificationsService.create({
        role: 'admin',
        title: alert.title,
        message: alert.message,
        type: alert.severity === 'critical' ? 'security' : 'warning',
        priority: alert.severity === 'critical' ? 'urgent' : 'high',
        metadata: alert.metadata,
      });

      await this.notificationsService.create({
        role: 'master',
        title: alert.title,
        message: alert.message,
        type: alert.severity === 'critical' ? 'security' : 'warning',
        priority: alert.severity === 'critical' ? 'urgent' : 'high',
        metadata: alert.metadata,
      });
    } catch (error) {
      console.error('Error creating security alert notification:', error);
    }

    return alert;
  }

  // ==================== UTILITÁRIOS ====================

  private async generateActivityTimeline(
    startDate: Date,
    period: '24h' | '7d' | '30d',
  ) {
    const intervals = period === '24h' ? 24 : period === '7d' ? 7 : 30;
    const intervalMs = period === '24h' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    const timeline: { time: string; activities: number }[] = [];

    for (let i = 0; i < intervals; i++) {
      const intervalStart = new Date(startDate.getTime() + i * intervalMs);
      const intervalEnd = new Date(intervalStart.getTime() + intervalMs);

      const count = await this.prisma.user_activity_log.count({
        where: {
          created_at: {
            gte: intervalStart,
            lt: intervalEnd,
          },
        },
      });

      timeline.push({
        time:
          period === '24h'
            ? `${intervalStart.getHours()}:00`
            : intervalStart.toLocaleDateString('pt-BR'),
        activities: count,
      });
    }

    return timeline;
  }

  private generateLoginTimeline(
    loginStats: any[],
    period: '24h' | '7d' | '30d',
  ) {
    const intervals = period === '24h' ? 24 : period === '7d' ? 7 : 30;
    const timeline: { time: string; successful: number; failed: number }[] = [];

    for (let i = 0; i < intervals; i++) {
      const successful = loginStats.filter(
        (l) =>
          l.status === 'success' && this.isInInterval(l.login_at, i, period),
      ).length;

      const failed = loginStats.filter(
        (l) =>
          l.status === 'failed' && this.isInInterval(l.login_at, i, period),
      ).length;

      timeline.push({
        time: period === '24h' ? `${i}:00` : `Dia ${i + 1}`,
        successful,
        failed,
      });
    }

    return timeline;
  }

  private isInInterval(
    date: Date,
    interval: number,
    period: '24h' | '7d' | '30d',
  ): boolean {
    const hour = date.getHours();
    const day = date.getDate();

    if (period === '24h') {
      return hour === interval;
    }

    return (
      Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000)) ===
      interval
    );
  }

  private formatActionName(action: string): string {
    const actionMap: { [key: string]: string } = {
      login: 'Login',
      logout: 'Logout',
      create_user: 'Criar Usuário',
      update_user: 'Atualizar Usuário',
      delete_user: 'Excluir Usuário',
      create_questionnaire: 'Criar Questionário',
      update_questionnaire: 'Atualizar Questionário',
      delete_questionnaire: 'Excluir Questionário',
      view_questionnaire: 'Visualizar Questionário',
      create_diagnostic: 'Criar Diagnóstico',
      update_diagnostic: 'Atualizar Diagnóstico',
      delete_diagnostic: 'Excluir Diagnóstico',
      view_diagnostic: 'Visualizar Diagnóstico',
      view_report: 'Visualizar Relatório',
      create_permission: 'Criar Permissão',
      update_permission: 'Atualizar Permissão',
      delete_permission: 'Excluir Permissão',
    };

    return (
      actionMap[action] ||
      action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    );
  }
}
